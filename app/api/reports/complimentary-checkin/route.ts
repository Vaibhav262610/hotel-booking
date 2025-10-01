import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
    }

    // Parse dates
    const fromDateObj = new Date(fromDate.split('/').reverse().join('-'))
    const toDateObj = new Date(toDate.split('/').reverse().join('-'))
    
    // Set time to end of day for toDate
    toDateObj.setHours(23, 59, 59, 999)

    // Fetch complimentary bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        check_in,
        actual_check_in,
        expected_checkout,
        actual_check_out,
        status,
        created_at,
        complimentary_reason,
        complimentary_approved_by,
        complimentary_approved_date,
        booking_rooms (
          id,
          room_id,
          check_in_date,
          check_out_date,
          actual_check_in,
          actual_check_out,
          room_rate,
          expected_nights,
          rooms (
            number,
            room_types (
              name
            )
          )
        ),
        guests (
          first_name,
          last_name,
          phone
        ),
        staff (
          name
        ),
        booking_payment_breakdown (
          total_amount,
          taxed_total_amount
        )
      `)
      .gte('created_at', fromDateObj.toISOString())
      .lte('created_at', toDateObj.toISOString())
      .not('complimentary_reason', 'is', null)

    if (error) {
      console.error('Error fetching complimentary bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    const complimentaryRecords: any[] = []

    bookings?.forEach((booking) => {
      const guest = booking.guests
      const staff = booking.staff
      const bookingRoom = booking.booking_rooms?.[0]
      const room = bookingRoom?.rooms
      const paymentBreakdown = booking.booking_payment_breakdown

      if (!guest || !bookingRoom || !room) return

      const guestName = `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      const roomNumber = room.number
      const roomType = room.room_types?.name || 'Unknown'
      const totalValue = paymentBreakdown?.taxed_total_amount || paymentBreakdown?.total_amount || 0

      complimentaryRecords.push({
        id: booking.id,
        booking_number: booking.booking_number,
        guest_name: guestName,
        guest_phone: guest.phone,
        room_number: roomNumber,
        room_type: roomType,
        checkin_time: bookingRoom.actual_check_in || booking.actual_check_in || bookingRoom.check_in_date || booking.check_in,
        checkout_time: bookingRoom.actual_check_out || booking.actual_check_out || bookingRoom.check_out_date || booking.expected_checkout,
        planned_nights: bookingRoom.expected_nights || 1,
        complimentary_reason: booking.complimentary_reason || 'Not specified',
        approved_by: booking.complimentary_approved_by || 'Pending',
        approved_date: booking.complimentary_approved_date || booking.created_at,
        status: booking.complimentary_approved_by ? 'approved' : 'pending',
        staff_name: staff?.name || 'Unknown',
        total_value: totalValue
      })
    })

    // Calculate summary
    const totalValue = complimentaryRecords.reduce((sum, r) => sum + r.total_value, 0)
    const approvedCount = complimentaryRecords.filter(r => r.status === 'approved').length
    const pendingCount = complimentaryRecords.filter(r => r.status === 'pending').length
    const rejectedCount = complimentaryRecords.filter(r => r.status === 'rejected').length

    const response = {
      total: complimentaryRecords.length,
      data: complimentaryRecords,
      summary: {
        total_value: totalValue,
        approved_count: approvedCount,
        pending_count: pendingCount,
        rejected_count: rejectedCount
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in complimentary-checkin API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
