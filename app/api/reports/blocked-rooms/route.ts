import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    console.log('Blocked Rooms Report API Request params:', { fromDate, toDate })

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

    console.log(`Fetching blocked rooms report data from ${startDate} to ${endDate}`)

    // Get blocked rooms with all required data
    const { data: reportData, error: reportError } = await supabase
      .from('blocked_rooms')
      .select(`
        id,
        room_id,
        blocked_date,
        blocked_from_date,
        blocked_to_date,
        reason,
        unblocked_date,
        unblock_reason,
        is_active,
        notes,
        rooms:room_id(
          id,
          number,
          room_types:room_type_id(name)
        ),
        blocked_by_staff:blocked_by_staff_id(name),
        unblocked_by_staff:unblocked_by_staff_id(name)
      `)
      .gte('blocked_date::date', startDate)
      .lte('blocked_date::date', endDate)
      .order('blocked_date', { ascending: false })

    if (reportError) {
      console.error('Error fetching blocked rooms report data:', reportError)
      return NextResponse.json({ 
        error: 'Failed to fetch report data', 
        details: reportError.message 
      }, { status: 500 })
    }

    console.log(`Blocked rooms report data fetched:`, reportData?.length || 0, 'records')

    // Process report data
    const reportList = (reportData || []).map((blockedRoom, index) => {
      const room = blockedRoom.rooms || { number: 'Unknown', room_types: { name: 'Unknown' } }
      const blockedByStaff = blockedRoom.blocked_by_staff || { name: 'Unknown Staff' }
      const unblockedByStaff = blockedRoom.unblocked_by_staff || { name: null }
      
      // Calculate room status
      const roomStatus = blockedRoom.is_active ? 'Blocked' : 'Unblocked'
      
      return {
        id: blockedRoom.id,
        s_no: index + 1,
        room_number: room.number,
        room_type: room.room_types?.name || 'Unknown',
        blocked_date: blockedRoom.blocked_date,
        room_status: roomStatus,
        blocked_from: blockedRoom.blocked_from_date,
        blocked_to: blockedRoom.blocked_to_date,
        reason: blockedRoom.reason || 'No reason provided',
        staff_blocked_by: blockedByStaff.name,
        unblocked_date: blockedRoom.unblocked_date,
        unblocked_by: unblockedByStaff.name,
        unblock_reason: blockedRoom.unblock_reason,
        notes: blockedRoom.notes
      }
    })

    // Calculate summary statistics
    const summary = {
      total_blocked: reportList.length,
      currently_blocked: reportList.filter(room => room.room_status === 'Blocked').length,
      unblocked: reportList.filter(room => room.room_status === 'Unblocked').length,
      blocked_by_staff: {} as Record<string, number>,
      blocked_by_reason: {} as Record<string, number>
    }

    // Count by staff and reason
    reportList.forEach(room => {
      const staff = room.staff_blocked_by
      const reason = room.reason
      
      summary.blocked_by_staff[staff] = (summary.blocked_by_staff[staff] || 0) + 1
      summary.blocked_by_reason[reason] = (summary.blocked_by_reason[reason] || 0) + 1
    })

    console.log('Blocked Rooms Report API Response:', {
      recordCount: reportList.length,
      summary
    })

    return NextResponse.json({
      success: true,
      data: reportList,
      summary
    })

  } catch (error) {
    console.error('Error in blocked rooms report API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
