import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

// Convert date from DD/MM/YYYY to YYYY-MM-DD (accept ISO too)
function convertDateFormat(dateStr: string): string {
  if (!dateStr) return ''
  if (dateStr.includes('-')) return dateStr
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

async function fetchArrivalReportData(startDate: string, endDate: string) {
  console.log(`Fetching arrival report data from ${startDate} to ${endDate}`)

  // Fetch booking_rooms with actual check-ins in the date range and aggregate per booking
  const { data: bookingRooms, error: brErr } = await supabase
    .from('booking_rooms')
    .select(`
      id,
      booking_id,
      check_in_date,
      check_out_date,
      actual_check_in,
      actual_check_out,
      room_status,
      bookings:booking_id(
        id,
        booking_number,
        number_of_guests,
        child_guests,
        arrival_type,
        ota_company,
        booked_on,
        staff:staff_id(name),
        guests:guest_id(name),
        booking_payment_breakdown:booking_payment_breakdown(advance_cash,advance_card,advance_upi,advance_bank,total_amount,outstanding_amount)
      ),
      rooms:room_id(
        number,
        room_types:room_type_id(name, code)
      )
    `)
    .gte('actual_check_in::date', startDate)
    .lte('actual_check_in::date', endDate)
    .in('room_status', ['checked_in','reserved'])
    .order('actual_check_in', { ascending: false })

  if (brErr) {
    console.error('Error fetching arrival report data:', brErr)
    throw new Error(`Failed to fetch arrival report data: ${brErr.message}`)
  }

  console.log(`Found ${bookingRooms?.length || 0} booking-room rows for arrival report`)

  // Aggregate per booking
  const byBooking: Record<string, any> = {}
  ;(bookingRooms || []).forEach((br: any) => {
    const booking = br.bookings
    if (!booking) return
    const key = booking.id
    if (!byBooking[key]) {
      const bp = (booking as any).booking_payment_breakdown || {}
      const advancePaid = (bp.advance_cash || 0) + (bp.advance_card || 0) + (bp.advance_upi || 0) + (bp.advance_bank || 0)
      byBooking[key] = {
        id: booking.id,
        booking_number: booking.booking_number,
        guest_name: (booking as any).guests?.name || 'N/A',
        arrival_type: booking.arrival_type || 'N/A',
        ota_company: booking.ota_company || 'N/A',
        arrival_date: br.actual_check_in || br.check_in_date,
        // Departure time: show actual if available, otherwise expected checkout date
        departure_time: br.actual_check_out || br.check_out_date || null,
        planned_nights: 0,
        pax: booking.number_of_guests || 0,
        child_pax: booking.child_guests || 0,
        total_rooms: 0,
        meal_plan: 'EP',
        deluxe_count: 0,
        deluxe_triple_count: 0,
        deluxe_quad_count: 0,
        king_suite_count: 0,
        residential_suite_count: 0,
        advance_paid: advancePaid,
        total_amount: bp.total_amount || 0,
        outstanding_amount: bp.outstanding_amount || 0,
        booking_staff_name: (booking as any).staff?.name || 'N/A',
        booked_on: booking.booked_on
      }
    }
    const rec = byBooking[key]
    // planned nights from this room
    if (br.check_in_date && br.check_out_date) {
      rec.planned_nights = Math.max(
        rec.planned_nights,
        Math.ceil((new Date(br.check_out_date).getTime() - new Date(br.check_in_date).getTime()) / (1000*60*60*24))
      )
    }
    rec.total_rooms += 1
    const code = (br.rooms as any)?.room_types?.code
    if (code && rec.hasOwnProperty(`${code}_count`)) {
      rec[`${code}_count`] += 1
    }
  })

  const arrivalData = Object.values(byBooking)

  return arrivalData
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

    console.log(`Fetching arrival report data from ${startDate} to ${endDate}`)

    try {
      // Fetch arrival report data
      const arrivalData = await fetchArrivalReportData(startDate, endDate)

      return NextResponse.json({
        total: arrivalData.length,
        data: arrivalData
      })

    } catch (error) {
      console.error('Error in arrival report API:', error)
      return NextResponse.json(
        { error: 'Failed to fetch arrival report data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in arrival report API:', error)
    return NextResponse.json(
      { error: 'Failed to process arrival report request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
