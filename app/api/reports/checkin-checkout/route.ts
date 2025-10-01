import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Convert DD/MM/YYYY to YYYY-MM-DD for database queries
function convertDateFormat(dateStr: string): string {
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Fetch check-in data - includes ALL bookings with check-in activity in the date range
async function fetchCheckinData(startDate: string, endDate: string) {
  console.log(`Fetching check-in data from ${startDate} to ${endDate}`)
  
  // Query 1: Get records with actual_check_in in date range from booking_rooms
  const { data: actualCheckinData, error: actualError } = await supabase
    .from('booking_rooms')
    .select(`
      id,
      actual_check_in,
      check_in_date,
      check_out_date,
      actual_check_out,
      booking_id,
      bookings:booking_id(
        id,
        booking_number,
      planned_nights,
      number_of_guests,
      child_guests,
      extra_guests,
      bill_number,
      arrival_type,
      ota_company,
      status,
      guests:guest_id(name, phone),
      hotels:hotel_id(name),
      staff:staff_id(name),
      booking_payment_breakdown:booking_payment_breakdown(
        advance_cash, advance_card, advance_upi, advance_bank,
        receipt_cash, receipt_card, receipt_upi, receipt_bank,
          total_amount, outstanding_amount, price_adjustment,
          taxed_total_amount, total_tax_amount
        )
      ),
        rooms:room_id(
          number,
          room_types:room_type_id(name)
      )
    `)
    .gte('actual_check_in::date', startDate)
    .lte('actual_check_in::date', endDate)
    .not('actual_check_in', 'is', null)

  if (actualError) {
    console.error('Error fetching actual check-in data:', actualError)
    throw actualError
  }

  // Query 2: Get records with check_in_date in date range (but no actual_check_in)
  const { data: scheduledCheckinData, error: scheduledError } = await supabase
    .from('booking_rooms')
    .select(`
      id,
      actual_check_in,
      check_in_date,
      check_out_date,
      actual_check_out,
      booking_id,
      bookings:booking_id(
        id,
        booking_number,
      planned_nights,
      number_of_guests,
      child_guests,
      extra_guests,
      bill_number,
      arrival_type,
      ota_company,
      status,
      guests:guest_id(name, phone),
      hotels:hotel_id(name),
      staff:staff_id(name),
      booking_payment_breakdown:booking_payment_breakdown(
        advance_cash, advance_card, advance_upi, advance_bank,
        receipt_cash, receipt_card, receipt_upi, receipt_bank,
          total_amount, outstanding_amount, price_adjustment,
          taxed_total_amount, total_tax_amount
        )
      ),
        rooms:room_id(
          number,
          room_types:room_type_id(name)
      )
    `)
    .gte('check_in_date::date', startDate)
    .lte('check_in_date::date', endDate)
    .is('actual_check_in', null)

  if (scheduledError) {
    console.error('Error fetching scheduled check-in data:', scheduledError)
    throw scheduledError
  }

  // Combine both datasets
  const allData = [...(actualCheckinData || []), ...(scheduledCheckinData || [])]
  
  // Sort by check-in time (actual first, then scheduled)
  allData.sort((a, b) => {
    const timeA = a.actual_check_in || a.check_in_date
    const timeB = b.actual_check_in || b.check_in_date
    return new Date(timeB).getTime() - new Date(timeA).getTime()
  })

  console.log(`Check-in query returned ${allData.length} records`)

  // Flatten data to show one row per room
  const mapped: any[] = []
  
  allData.forEach(roomRecord => {
    const booking = roomRecord.bookings
    if (booking) {
      mapped.push({
        id: `${booking.id}_${roomRecord.id}`, // Unique ID for each room
        booking_id: booking.id, // Keep reference to original booking
        booking_number: booking.booking_number,
        checkin_time: roomRecord.actual_check_in || roomRecord.check_in_date,
        expected_checkout: roomRecord.check_out_date || null,
        arrival_type: booking.arrival_type,
        company_ota_agent: booking.ota_company || 'N/A',
        advance_amount: 0,
        status: booking.status,
        planned_nights: booking.planned_nights,
        number_of_guests: booking.number_of_guests,
        child_guests: booking.child_guests,
        extra_guests: booking.extra_guests,
        bill_number: booking.bill_number,
        advance_cash: (booking.booking_payment_breakdown as any)?.advance_cash || 0,
        advance_card: (booking.booking_payment_breakdown as any)?.advance_card || 0,
        advance_bank: (booking.booking_payment_breakdown as any)?.advance_bank || 0,
        advance_upi: (booking.booking_payment_breakdown as any)?.advance_upi || 0,
        advance_total: ((booking.booking_payment_breakdown as any)?.advance_cash || 0)
          + ((booking.booking_payment_breakdown as any)?.advance_card || 0)
          + ((booking.booking_payment_breakdown as any)?.advance_bank || 0)
          + ((booking.booking_payment_breakdown as any)?.advance_upi || 0),
        guest_name: (booking.guests as any)?.name || 'N/A',
        guest_phone: (booking.guests as any)?.phone || 'N/A',
        room_number: (roomRecord.rooms as any)?.number || 'N/A',
        room_type: (roomRecord.rooms as any)?.room_types?.name || 'N/A',
        hotel_name: (booking.hotels as any)?.name || 'N/A',
        staff_name: (booking.staff as any)?.name || 'N/A',
        // Room-specific data
        room_check_in: roomRecord.check_in_date,
        room_check_out: roomRecord.check_out_date,
        room_actual_check_in: roomRecord.actual_check_in,
        room_actual_check_out: roomRecord.actual_check_out,
        room_status: roomRecord.room_status
      })
    }
  })

  // Group into primary vs special statuses
  const specialStatuses = new Set(['cancelled', 'no_show', 'pending'])
  const cancelled = mapped.filter(r => r.status === 'cancelled')
  const noShow = mapped.filter(r => r.status === 'no_show')
  const pending = mapped.filter(r => r.status === 'pending')
  const primary = mapped.filter(r => !specialStatuses.has(r.status))

  return { primary, cancelled, no_show: noShow, pending }
}

// Fetch check-out data - includes ALL bookings with check-out activity in the date range
async function fetchCheckoutData(startDate: string, endDate: string) {
  console.log(`Fetching check-out data from ${startDate} to ${endDate}`)
  
  // Query 1: Get records with actual_check_out in date range from booking_rooms
  const { data: actualCheckoutData, error: actualError } = await supabase
    .from('booking_rooms')
    .select(`
      id,
      actual_check_out,
      check_in_date,
      check_out_date,
      actual_check_in,
      booking_id,
      bookings:booking_id(
        id,
        booking_number,
      actual_nights,
      number_of_guests,
      child_guests,
      extra_guests,
      bill_number,
      checkout_notes,
      arrival_type,
      ota_company,
      status,
      guests:guest_id(name, phone),
      hotels:hotel_id(name),
      staff:staff_id(name),
      booking_payment_breakdown:booking_payment_breakdown(
        receipt_cash, receipt_card, receipt_upi, receipt_bank,
          total_amount, outstanding_amount, price_adjustment,
          taxed_total_amount, total_tax_amount
        )
      ),
        rooms:room_id(
          number,
          room_types:room_type_id(name)
      )
    `)
    .gte('actual_check_out::date', startDate)
    .lte('actual_check_out::date', endDate)
    .not('actual_check_out', 'is', null)

  if (actualError) {
    console.error('Error fetching actual check-out data:', actualError)
    throw actualError
  }

  // Query 2: Get records with check_out_date in date range (but no actual_check_out)
  const { data: scheduledCheckoutData, error: scheduledError } = await supabase
    .from('booking_rooms')
    .select(`
      id,
      actual_check_out,
      check_in_date,
      check_out_date,
      actual_check_in,
      booking_id,
      bookings:booking_id(
        id,
        booking_number,
      actual_nights,
      number_of_guests,
      child_guests,
      extra_guests,
      bill_number,
      checkout_notes,
      arrival_type,
      ota_company,
      status,
      guests:guest_id(name, phone),
      hotels:hotel_id(name),
      staff:staff_id(name),
      booking_payment_breakdown:booking_payment_breakdown(
        receipt_cash, receipt_card, receipt_upi, receipt_bank,
          total_amount, outstanding_amount, price_adjustment,
          taxed_total_amount, total_tax_amount
        )
      ),
        rooms:room_id(
          number,
          room_types:room_type_id(name)
      )
    `)
    .gte('check_out_date::date', startDate)
    .lte('check_out_date::date', endDate)
    .is('actual_check_out', null)

  if (scheduledError) {
    console.error('Error fetching scheduled check-out data:', scheduledError)
    throw scheduledError
  }

  // Combine both datasets
  const allData = [...(actualCheckoutData || []), ...(scheduledCheckoutData || [])]
  
  // Sort by check-out time (actual first, then scheduled)
  allData.sort((a, b) => {
    const timeA = a.actual_check_out || a.check_out_date
    const timeB = b.actual_check_out || b.check_out_date
    return new Date(timeB).getTime() - new Date(timeA).getTime()
  })

  console.log(`Check-out query returned ${allData.length} records`)

  // Transform data to match expected structure (one row per room)
  const mapped: any[] = []
  
  allData.forEach(roomRecord => {
    const booking = roomRecord.bookings
    if (booking) {
      mapped.push({
        id: `${booking.id}_${roomRecord.id}`, // Unique ID for each room
        booking_id: booking.id, // Keep reference to original booking
        booking_number: booking.booking_number,
        checkout_time: roomRecord.actual_check_out || roomRecord.check_out_date,
        arrival_type: booking.arrival_type,
        company_ota_agent: booking.ota_company || 'N/A',
        full_payment: (booking.booking_payment_breakdown as any)?.total_amount || 0,
        receipt_cash: (booking.booking_payment_breakdown as any)?.receipt_cash || 0,
        receipt_card: (booking.booking_payment_breakdown as any)?.receipt_card || 0,
        receipt_bank: (booking.booking_payment_breakdown as any)?.receipt_bank || 0,
        receipt_upi: (booking.booking_payment_breakdown as any)?.receipt_upi || 0,
        receipt_total: ((booking.booking_payment_breakdown as any)?.receipt_cash || 0)
          + ((booking.booking_payment_breakdown as any)?.receipt_card || 0)
          + ((booking.booking_payment_breakdown as any)?.receipt_bank || 0)
          + ((booking.booking_payment_breakdown as any)?.receipt_upi || 0),
        outstanding_amount: (booking.booking_payment_breakdown as any)?.outstanding_amount || 0,
        payment_method: 'N/A',
        price_adjustment: (booking.booking_payment_breakdown as any)?.price_adjustment || 0,
        checkout_notes: booking.checkout_notes || '',
        status: booking.status,
        actual_nights: booking.actual_nights,
        number_of_guests: booking.number_of_guests,
        child_guests: booking.child_guests,
        extra_guests: booking.extra_guests,
        bill_number: booking.bill_number,
        guest_name: (booking.guests as any)?.name || 'N/A',
        guest_phone: (booking.guests as any)?.phone || 'N/A',
        room_number: (roomRecord.rooms as any)?.number || 'N/A',
        room_type: (roomRecord.rooms as any)?.room_types?.name || 'N/A',
        hotel_name: (booking.hotels as any)?.name || 'N/A',
        staff_name: (booking.staff as any)?.name || 'N/A',
        // Room-specific data
        room_check_in: roomRecord.check_in_date,
        room_check_out: roomRecord.check_out_date,
        room_actual_check_in: roomRecord.actual_check_in,
        room_actual_check_out: roomRecord.actual_check_out,
        room_status: roomRecord.room_status
      })
    }
  })

  const specialStatuses = new Set(['cancelled', 'no_show', 'pending'])
  const cancelled = mapped.filter(r => r.status === 'cancelled')
  const noShow = mapped.filter(r => r.status === 'no_show')
  const pending = mapped.filter(r => r.status === 'pending')
  const primary = mapped.filter(r => !specialStatuses.has(r.status))

  return { primary, cancelled, no_show: noShow, pending }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate and toDate parameters are required' },
        { status: 400 }
      )
    }

    // Convert date format from DD/MM/YYYY to YYYY-MM-DD
    const startDate = convertDateFormat(fromDate)
    const endDate = convertDateFormat(toDate)

    // Validate date range
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use DD/MM/YYYY format' },
        { status: 400 }
      )
    }
    
    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: 'fromDate cannot be after toDate' },
        { status: 400 }
      )
    }

    console.log(`Fetching data from ${startDate} to ${endDate}`)

    try {
      // Fetch both check-in and check-out data
      const [checkinGrouped, checkoutGrouped] = await Promise.all([
        fetchCheckinData(startDate, endDate),
        fetchCheckoutData(startDate, endDate)
      ])

      const checkinsTotal = checkinGrouped.primary.length + checkinGrouped.cancelled.length + checkinGrouped.no_show.length + checkinGrouped.pending.length
      const checkoutsTotal = checkoutGrouped.primary.length + checkoutGrouped.cancelled.length + checkoutGrouped.no_show.length + checkoutGrouped.pending.length

      return NextResponse.json({
        checkins: {
          total: checkinsTotal,
          primary: checkinGrouped.primary,
          cancelled: checkinGrouped.cancelled,
          no_show: checkinGrouped.no_show,
          pending: checkinGrouped.pending
        },
        checkouts: {
          total: checkoutsTotal,
          primary: checkoutGrouped.primary,
          cancelled: checkoutGrouped.cancelled,
          no_show: checkoutGrouped.no_show,
          pending: checkoutGrouped.pending
        }
      })
    } catch (fetchError) {
      console.error('Error fetching data:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch report data', details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in checkin-checkout API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
