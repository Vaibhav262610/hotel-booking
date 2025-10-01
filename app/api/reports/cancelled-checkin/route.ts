import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    console.log('Cancelled Checkin Report API Request params:', { fromDate, toDate })

    // Validate date parameters
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Both fromDate and toDate parameters are required' },
        { status: 400 }
      )
    }

    // Convert date format from DD/MM/YYYY to YYYY-MM-DD (accept ISO)
    const convertDateFormat = (dateStr: string) => {
      if (!dateStr) return ''
      if (dateStr.includes('-')) return dateStr
      const [day, month, year] = dateStr.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

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

    console.log(`Fetching cancelled checkin report data from ${startDate} to ${endDate}`)

    // Get cancelled bookings with joined booking and rooms
    const { data: reportData, error: reportError } = await supabase
      .from('cancelled_bookings')
      .select(`
        id,
        booking_id,
        cancellation_reason,
        cancel_date,
        cancelled_by_staff_id,
        refund_amount,
        refund_processed,
        refund_processed_date,
        notes,
        bookings:booking_id(
          id,
          booking_number,
          planned_nights,
          booking_rooms:booking_rooms(
            id,
            room_id,
            check_in_date,
            check_out_date,
            rooms:room_id(
              id,
              number,
              room_types:room_type_id(name)
            )
          )
        )
      `)
      .gte('cancel_date', startDate + 'T00:00:00')
      .lte('cancel_date', endDate + 'T23:59:59')
      .order('cancel_date', { ascending: false })

    if (reportError) {
      console.error('Error fetching cancelled checkin report data:', reportError)
      return NextResponse.json({ 
        error: 'Failed to fetch report data', 
        details: reportError.message 
      }, { status: 500 })
    }

    console.log(`Cancelled checkin report data fetched:`, reportData?.length || 0, 'records')

    // Fetch staff details separately to avoid nested join issues
    let staffMap: Record<string, { id: string; name: string }> = {}
    const staffIds = Array.from(new Set((reportData || []).map((r: any) => r.cancelled_by_staff_id).filter(Boolean)))
    if (staffIds.length > 0) {
      const { data: staffRows, error: staffErr } = await supabase
        .from('staff')
        .select('id,name')
        .in('id', staffIds)
      if (staffErr) {
        console.error('Error fetching staff for cancelled checkin report:', staffErr)
      } else {
        staffMap = (staffRows || []).reduce((acc: any, s: any) => { acc[s.id] = s; return acc }, {})
      }
    }

    // Process report data - one row per booking (not per room for cancelled bookings)
    const reportList = (reportData || []).map((cancelledBooking, index) => {
      const booking = cancelledBooking.bookings || {}
      const cancelledByStaff = staffMap[cancelledBooking.cancelled_by_staff_id] || { name: 'Unknown Staff', id: null }
      const roomCount = booking.booking_rooms?.length || 0
      
      // Calculate number of nights
      // Derive nights from first room if available
      const numberOfNights = booking.booking_rooms?.length
        ? Math.ceil((new Date(booking.booking_rooms[0].check_out_date).getTime() - new Date(booking.booking_rooms[0].check_in_date).getTime()) / (1000*60*60*24))
        : (booking.planned_nights || 0)
      
      return {
        id: cancelledBooking.id,
        s_no: index + 1,
        booking_id: booking.booking_number || 'Unknown',
        number_of_rooms: roomCount,
        expected_checkin_date: booking.booking_rooms?.[0]?.check_in_date || null,
        expected_checkout_date: booking.booking_rooms?.[0]?.check_out_date || null,
        number_of_nights: numberOfNights,
        cancellation_reason: cancelledBooking.cancellation_reason || 'No reason provided',
        cancel_date: cancelledBooking.cancel_date,
        staff_name: cancelledByStaff.name,
        staff_id: cancelledByStaff.id,
        // Additional cancellation details
        refund_amount: cancelledBooking.refund_amount || 0,
        refund_processed: cancelledBooking.refund_processed || false,
        refund_processed_date: cancelledBooking.refund_processed_date,
        cancellation_notes: cancelledBooking.notes,
        // Additional room details for reference
        rooms: booking.booking_rooms?.map((br: any) => ({
          room_number: br.rooms?.number || 'Unknown',
          room_type: br.rooms?.room_types?.name || 'Unknown'
        })) || []
      }
    })

    // Calculate summary statistics
    const summary = {
      total_cancelled: reportList.length,
      total_rooms_cancelled: reportList.reduce((sum, booking) => sum + booking.number_of_rooms, 0),
      total_nights_cancelled: reportList.reduce((sum, booking) => sum + booking.number_of_nights, 0),
      total_refund_amount: reportList.reduce((sum, booking) => sum + (booking.refund_amount || 0), 0),
      refunds_processed: reportList.filter(booking => booking.refund_processed).length,
      refunds_pending: reportList.filter(booking => !booking.refund_processed).length,
      cancellation_reasons: {} as Record<string, number>,
      cancelled_by_staff: {} as Record<string, number>
    }

    // Count by cancellation reason and staff
    reportList.forEach(booking => {
      const reason = booking.cancellation_reason
      const staff = booking.staff_name
      
      summary.cancellation_reasons[reason] = (summary.cancellation_reasons[reason] || 0) + 1
      summary.cancelled_by_staff[staff] = (summary.cancelled_by_staff[staff] || 0) + 1
    })

    console.log('Cancelled Checkin Report API Response:', {
      recordCount: reportList.length,
      summary
    })

    return NextResponse.json({
      success: true,
      data: reportList,
      summary
    })

  } catch (error) {
    console.error('Error in cancelled checkin report API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
