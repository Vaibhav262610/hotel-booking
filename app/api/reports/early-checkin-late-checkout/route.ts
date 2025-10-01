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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
    }

    // Parse dates
    const startDate = convertDateFormat(fromDate)
    const endDate = convertDateFormat(toDate)
    const fromDateObj = new Date(startDate)
    const toDateObj = new Date(endDate)
    
    // Set time to end of day for toDate
    toDateObj.setHours(23, 59, 59, 999)

    // Fetch from booking_rooms first for accurate date filters
    const { data: bookingRooms, error: brErr } = await supabase
      .from('booking_rooms')
      .select(`
        id,
        booking_id,
        check_in_date,
        check_out_date,
        actual_check_in,
        actual_check_out,
        rooms:room_id(number, room_types:room_type_id(name)),
        bookings:booking_id(
          id,
          booking_number,
          status,
          check_in,
          actual_check_in,
          expected_checkout,
          actual_check_out,
          guests:guest_id(first_name,last_name,phone),
          staff:staff_id(name)
        )
      `)
      .or(
        `and(actual_check_in.gte.${startDate},actual_check_in.lte.${endDate}),and(actual_check_out.gte.${startDate},actual_check_out.lte.${endDate})`
      )
      .order('actual_check_in', { ascending: true })

    if (brErr) {
      console.error('Error fetching booking_rooms for early/late report:', brErr)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    const earlyCheckinLateCheckoutRecords: any[] = []

    (bookingRooms || []).forEach((br: any) => {
      const booking = br.bookings
      const guest = booking?.guests
      const staff = booking?.staff
      const room = br.rooms

      if (!booking || !guest || !room) return

      const guestName = `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      const roomNumber = room.number
      const roomType = room.room_types?.name || 'Unknown'

      // Check for early check-in
      const actualCheckIn = br.actual_check_in || booking.actual_check_in
      const plannedCheckIn = br.check_in_date || booking.check_in
      
      if (actualCheckIn && plannedCheckIn) {
        const actualTime = new Date(actualCheckIn)
        const plannedTime = new Date(plannedCheckIn)
        const differenceHours = (actualTime.getTime() - plannedTime.getTime()) / (1000 * 60 * 60)
        
        // Consider early if checked in more than 2 hours before planned time
        if (differenceHours < -2) {
          earlyCheckinLateCheckoutRecords.push({
            id: `${booking.id}-${br.id}-early-checkin`,
            booking_number: booking.booking_number,
            guest_name: guestName,
            guest_phone: guest.phone,
            room_number: roomNumber,
            room_type: roomType,
            checkin_time: actualCheckIn,
            checkout_time: null,
            planned_checkin: plannedCheckIn,
            planned_checkout: null,
            checkin_difference_hours: differenceHours,
            checkout_difference_hours: 0,
            type: 'early_checkin',
            status: booking.status,
            staff_name: staff?.name || 'Unknown'
          })
        }
      }

      // Check for late checkout
      const actualCheckOut = br.actual_check_out
      const plannedCheckOut = br.check_out_date || booking.expected_checkout
      
      if (actualCheckOut && plannedCheckOut) {
        const actualTime = new Date(actualCheckOut)
        const plannedTime = new Date(plannedCheckOut)
        const differenceHours = (actualTime.getTime() - plannedTime.getTime()) / (1000 * 60 * 60)
        
        // Consider late if checked out more than 2 hours after planned time
        if (differenceHours > 2) {
          earlyCheckinLateCheckoutRecords.push({
            id: `${booking.id}-${br.id}-late-checkout`,
            booking_number: booking.booking_number,
            guest_name: guestName,
            guest_phone: guest.phone,
            room_number: roomNumber,
            room_type: roomType,
            checkin_time: null,
            checkout_time: actualCheckOut,
            planned_checkin: null,
            planned_checkout: plannedCheckOut,
            checkin_difference_hours: 0,
            checkout_difference_hours: differenceHours,
            type: 'late_checkout',
            status: booking.status,
            staff_name: staff?.name || 'Unknown'
          })
        }
      }
    })

    // Calculate summary
    const earlyCheckins = earlyCheckinLateCheckoutRecords.filter(r => r.type === 'early_checkin').length
    const lateCheckouts = earlyCheckinLateCheckoutRecords.filter(r => r.type === 'late_checkout').length
    const totalDifferenceHours = earlyCheckinLateCheckoutRecords.reduce((sum, r) => 
      sum + Math.abs(r.checkin_difference_hours || r.checkout_difference_hours), 0
    )

    const response = {
      total: earlyCheckinLateCheckoutRecords.length,
      data: earlyCheckinLateCheckoutRecords,
      summary: {
        early_checkins: earlyCheckins,
        late_checkouts: lateCheckouts,
        total_difference_hours: totalDifferenceHours
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in early-checkin-late-checkout API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
