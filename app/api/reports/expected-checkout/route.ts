import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

// Convert DD/MM/YYYY to YYYY-MM-DD for database queries (accept ISO too)
function convertDateFormat(dateStr: string): string {
  if (!dateStr) return ''
  if (dateStr.includes('-')) return dateStr
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Fetch expected checkout data - bookings that are checked in and expected to checkout in date range
async function fetchExpectedCheckoutData(startDate: string, endDate: string) {
  console.log(`Fetching expected checkout data from ${startDate} to ${endDate}`)
  
  const { data, error } = await supabase
    .from('booking_rooms')
    .select(`
      id,
      booking_id,
      room_id,
      check_in_date,
      check_out_date,
      actual_check_in,
      actual_check_out,
      room_status,
      bookings:booking_id(
        id,
        booking_number,
        planned_nights,
        number_of_guests,
        child_guests,
        extra_guests,
        status,
        arrival_type,
        ota_company,
        guests:guest_id(name, phone),
        hotels:hotel_id(name),
        staff:staff_id(name)
      ),
      rooms:room_id(
        number,
        room_type_id,
        room_types:room_type_id(name)
      )
    `)
    .gte('check_out_date::date', startDate)
    .lte('check_out_date::date', endDate)
    .is('actual_check_out', null)
    .in('room_status', ['checked_in'])
    .order('check_out_date', { ascending: true })

  if (error) {
    console.error('Error fetching expected checkout data:', error)
    throw error
  }

  console.log(`Expected checkout query returned ${data?.length || 0} records`)
  console.log('Data type:', typeof data, 'Is array:', Array.isArray(data))

  // Each record is already one room; flatten to expected shape
  const dataArray = Array.isArray(data) ? data : []
  const mapped = dataArray.map((br: any) => {
    const booking = br.bookings
    return {
      id: `${booking?.id || 'unknown'}_${br.id}`,
      booking_id: booking?.id || null,
      booking_number: booking?.booking_number || 'N/A',
      checkin_date: br.actual_check_in || br.check_in_date,
      expected_checkout: br.check_out_date,
      planned_nights: booking?.planned_nights || null,
      number_of_guests: booking?.number_of_guests || null,
      child_guests: booking?.child_guests || null,
      extra_guests: booking?.extra_guests || null,
      status: booking?.status || 'checked_in',
      arrival_type: booking?.arrival_type || null,
      ota_company: booking?.ota_company || null,
      guest_name: (booking as any)?.guests?.name || 'N/A',
      guest_phone: (booking as any)?.guests?.phone || 'N/A',
      room_number: (br as any).rooms?.number || 'N/A',
      room_type: (br as any).rooms?.room_types?.name || 'N/A',
      hotel_name: (booking as any)?.hotels?.name || 'N/A',
      staff_name: (booking as any)?.staff?.name || 'N/A',
      // Room-specific data
      room_check_in: br.check_in_date,
      room_check_out: br.check_out_date,
      room_actual_check_in: br.actual_check_in,
      room_actual_check_out: br.actual_check_out,
      room_status: br.room_status
    }
  })

  return mapped
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

    // Fetch expected checkout data
    const data = await fetchExpectedCheckoutData(startDate, endDate)

    return NextResponse.json({
      total: data.length,
      data
    })

  } catch (error) {
    console.error('Error in expected checkout API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expected checkout data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
