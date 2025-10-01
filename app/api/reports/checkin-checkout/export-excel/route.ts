import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Convert DD/MM/YYYY to YYYY-MM-DD for database queries
function convertDateFormat(dateStr: string): string {
  // Accept both DD/MM/YYYY and YYYY-MM-DD
  if (!dateStr) return ''
  if (dateStr.includes('-')) {
    // Already ISO-like
    return dateStr
  }
  if (dateStr.includes('/')) {
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return dateStr
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
      booked_on,
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
      booked_on,
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
    const booking = (roomRecord as any).bookings
    if (booking) {
      mapped.push({
        id: `${booking.id}_${roomRecord.id}`, // Unique ID for each room
        booking_id: booking.id, // Keep reference to original booking
        booking_number: booking.booking_number,
        checkin_time: roomRecord.actual_check_in || roomRecord.check_in_date,
        expected_checkout: roomRecord.check_out_date,
        planned_nights: booking.planned_nights,
        arrival_type: booking.arrival_type,
        company_ota_agent: booking.ota_company || 'N/A',
        booked_on: booking.booked_on,
        advance_cash: (booking as any).booking_payment_breakdown?.advance_cash || 0,
        advance_card: (booking as any).booking_payment_breakdown?.advance_card || 0,
        advance_upi: (booking as any).booking_payment_breakdown?.advance_upi || 0,
        advance_bank: (booking as any).booking_payment_breakdown?.advance_bank || 0,
        advance_total: ((booking as any).booking_payment_breakdown?.advance_cash || 0)
          + ((booking as any).booking_payment_breakdown?.advance_card || 0)
          + ((booking as any).booking_payment_breakdown?.advance_upi || 0)
          + ((booking as any).booking_payment_breakdown?.advance_bank || 0),
        status: booking.status,
        number_of_guests: booking.number_of_guests,
        child_guests: booking.child_guests,
        extra_guests: booking.extra_guests,
        bill_number: booking.bill_number,
        payment_method: 'N/A',
        guest_name: (booking as any).guests?.name || 'N/A',
        guest_phone: (booking as any).guests?.phone || 'N/A',
        room_number: (roomRecord as any).rooms?.number || 'N/A',
        room_type: (roomRecord as any).rooms?.room_types?.name || 'N/A',
        hotel_name: (booking as any).hotels?.name || 'N/A',
        staff_name: (booking as any).staff?.name || 'N/A',
        // Room-specific data
        room_check_in: roomRecord.check_in_date,
        room_check_out: roomRecord.check_out_date,
        room_actual_check_in: roomRecord.actual_check_in,
        room_actual_check_out: roomRecord.actual_check_out,
        room_status: (roomRecord as any).room_status || 'N/A'
      })
    }
  })

  return mapped
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
      booked_on,
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
      booked_on,
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

  // Flatten data to show one row per room
  const mapped: any[] = []
  
  allData.forEach(roomRecord => {
    const booking = (roomRecord as any).bookings
    if (booking) {
      mapped.push({
        id: `${booking.id}_${roomRecord.id}`, // Unique ID for each room
        booking_id: booking.id, // Keep reference to original booking
        booking_number: booking.booking_number,
        checkout_time: roomRecord.actual_check_out || roomRecord.check_out_date,
        actual_nights: booking.actual_nights,
        full_payment: (booking as any).booking_payment_breakdown?.total_amount || 0,
        receipt_cash: (booking as any).booking_payment_breakdown?.receipt_cash || 0,
        receipt_card: (booking as any).booking_payment_breakdown?.receipt_card || 0,
        receipt_upi: (booking as any).booking_payment_breakdown?.receipt_upi || 0,
        receipt_bank: (booking as any).booking_payment_breakdown?.receipt_bank || 0,
        receipt_total: ((booking as any).booking_payment_breakdown?.receipt_cash || 0)
          + ((booking as any).booking_payment_breakdown?.receipt_card || 0)
          + ((booking as any).booking_payment_breakdown?.receipt_upi || 0)
          + ((booking as any).booking_payment_breakdown?.receipt_bank || 0),
        outstanding_amount: (booking as any).booking_payment_breakdown?.outstanding_amount || 0,
        payment_method: 'N/A',
        price_adjustment: (booking as any).booking_payment_breakdown?.price_adjustment || 0,
        checkout_notes: booking.checkout_notes || '',
        status: booking.status,
        number_of_guests: booking.number_of_guests,
        child_guests: booking.child_guests,
        extra_guests: booking.extra_guests,
        bill_number: booking.bill_number,
        guest_name: (booking as any).guests?.name || 'N/A',
        guest_phone: (booking as any).guests?.phone || 'N/A',
        room_number: (roomRecord as any).rooms?.number || 'N/A',
        room_type: (roomRecord as any).rooms?.room_types?.name || 'N/A',
        hotel_name: (booking as any).hotels?.name || 'N/A',
        staff_name: (booking as any).staff?.name || 'N/A',
        // Room-specific data
        room_check_in: roomRecord.check_in_date,
        room_check_out: roomRecord.check_out_date,
        room_actual_check_in: roomRecord.actual_check_in,
        room_actual_check_out: roomRecord.actual_check_out,
        room_status: (roomRecord as any).room_status || 'N/A'
      })
    }
  })

  return mapped
}

// Generate Excel-compatible CSV with advanced formatting
function generateExcelCSV(checkinData: any[], checkoutData: any[]): string {
  let csvContent = ''
  
  // Add BOM for UTF-8 encoding (helps with Excel compatibility)
  csvContent += '\uFEFF'
  
  // Header with hotel information
  csvContent += 'HOTEL CHECK-IN/CHECK-OUT REPORT\n'
  csvContent += 'Generated on: ' + new Date().toLocaleString('en-IN') + '\n'
  csvContent += '='.repeat(120) + '\n\n'
  
  // Check-in Report Section with borders and formatting
  csvContent += 'CHECK-IN REPORT\n'
  csvContent += '='.repeat(120) + '\n'
  csvContent += 'S.No,Booking Number,Check-in Time,Expected Checkout,Booked On,Planned Nights,Guest Name,PAX,Child PAX,Extra PAX,Phone,Room Number,Room Type,Arrival Type,Company/OTA/Agent,Advance Cash,Advance Card,Advance UPI,Advance Bank,Advance Total,Bill #,Staff Name\n'
  csvContent += '-'.repeat(120) + '\n'
  
  checkinData.forEach((record, index) => {
    const checkinTime = record.checkin_time ? new Date(record.checkin_time).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-') : 'N/A'
    
    csvContent += [
      `"${index + 1}"`,
      `"${record.booking_number}"`,
      `"${checkinTime}"`,
      `"${record.expected_checkout ? new Date(record.expected_checkout).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-') : ''}"`,
      `"${record.booked_on ? new Date(record.booked_on).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-') : 'N/A'}"`,
      `"${record.planned_nights ?? ''}"`,
      `"${record.guest_name}"`,
      `"${record.number_of_guests ?? ''}"`,
      `"${record.child_guests ?? ''}"`,
      `"${record.extra_guests ?? ''}"`,
      `"${record.guest_phone}"`,
      `"${record.room_number}"`,
      `"${record.room_type}"`,
      `"${record.arrival_type || 'N/A'}"`,
      `"${record.company_ota_agent || 'N/A'}"`,
      `"₹${record.advance_cash || 0}"`,
      `"₹${record.advance_card || 0}"`,
      `"₹${record.advance_upi || 0}"`,
      `"₹${record.advance_bank || 0}"`,
      `"₹${record.advance_total || 0}"`,
      `"${record.bill_number || ''}"`,
      `"${record.payment_method || 'N/A'}"`,
      `"${record.staff_name}"`
    ].join(',') + '\n'
  })
  
  // Add separator with borders
  csvContent += '\n\n'
  csvContent += '='.repeat(120) + '\n'
  csvContent += 'CHECK-OUT REPORT\n'
  csvContent += '='.repeat(120) + '\n'
  csvContent += 'S.No,Booking Number,Check-out Time,Actual Nights,Guest Name,PAX,Child PAX,Extra PAX,Phone,Room Number,Room Type,Arrival Type,Company/OTA/Agent,Receipt Cash,Receipt Card,Receipt UPI,Receipt Bank,Receipt Total,Outstanding,Price Adjustment,Notes,Bill #,Staff Name\n'
  csvContent += '-'.repeat(120) + '\n'
  
  checkoutData.forEach((record, index) => {
    const checkoutTime = record.checkout_time ? new Date(record.checkout_time).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-') : 'N/A'
    
    const priceAdjustment = record.price_adjustment ? `₹${record.price_adjustment}` : '₹0'
    
    csvContent += [
      `"${index + 1}"`,
      `"${record.booking_number}"`,
      `"${checkoutTime}"`,
      `"${record.actual_nights ?? ''}"`,
      `"${record.guest_name}"`,
      `"${record.number_of_guests ?? ''}"`,
      `"${record.child_guests ?? ''}"`,
      `"${record.extra_guests ?? ''}"`,
      `"${record.guest_phone}"`,
      `"${record.room_number}"`,
      `"${record.room_type}"`,
      `"${record.arrival_type || 'N/A'}"`,
      `"${record.company_ota_agent || 'N/A'}"`,
      `"₹${record.receipt_cash || 0}"`,
      `"₹${record.receipt_card || 0}"`,
      `"₹${record.receipt_upi || 0}"`,
      `"₹${record.receipt_bank || 0}"`,
      `"₹${record.receipt_total || 0}"`,
      `"₹${record.outstanding_amount || 0}"`,
      `"${priceAdjustment}"`,
      `"${record.checkout_notes || ''}"`,
      `"${record.bill_number || ''}"`,
      `"${record.staff_name}"`
    ].join(',') + '\n'
  })
  
  // Add summary section with financial totals
  csvContent += '\n\n'
  csvContent += '='.repeat(120) + '\n'
  csvContent += 'SUMMARY REPORT\n'
  csvContent += '='.repeat(120) + '\n'
  csvContent += `Total Check-ins: ${checkinData.length}\n`
  csvContent += `Total Check-outs: ${checkoutData.length}\n`
  csvContent += `Total Advance Payments: ₹${checkinData.reduce((sum, record) => sum + (record.advance_total || 0), 0).toLocaleString('en-IN')}\n`
  csvContent += `Total Full Payments: ₹${checkoutData.reduce((sum, record) => sum + (record.full_payment || 0), 0).toLocaleString('en-IN')}\n`
  csvContent += `Total Price Adjustments: ₹${checkoutData.reduce((sum, record) => sum + (record.price_adjustment || 0), 0).toLocaleString('en-IN')}\n`
  csvContent += `Net Revenue: ₹${(checkoutData.reduce((sum, record) => sum + (record.full_payment || 0), 0) + checkoutData.reduce((sum, record) => sum + (record.price_adjustment || 0), 0)).toLocaleString('en-IN')}\n`
  
  // Add footer
  csvContent += '\n\n'
  csvContent += '='.repeat(120) + '\n'
  csvContent += 'End of Report\n'
  csvContent += '='.repeat(120) + '\n'
  
  return csvContent
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

    // Fetch both check-in and check-out data
    const [checkinData, checkoutData] = await Promise.all([
      fetchCheckinData(startDate, endDate),
      fetchCheckoutData(startDate, endDate)
    ])

    // Generate Excel-compatible CSV content
    const csvContent = generateExcelCSV(checkinData, checkoutData)
    
    // Generate filename with date range
    const filename = `checkin-checkout-report-${fromDate.replace(/\//g, '-')}-to-${toDate.replace(/\//g, '-')}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    })

  } catch (error) {
    console.error('Error in checkin-checkout Excel export API:', error)
    return NextResponse.json(
      { error: 'Failed to export report data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
