import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

function normalizeDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  if (dateStr.includes('-')) return dateStr
  if (dateStr.includes('/')) {
    const [dd, mm, yyyy] = dateStr.split('/')
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  return dateStr
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = normalizeDate(searchParams.get('fromDate'))
    const toDate = normalizeDate(searchParams.get('toDate'))
    const status = searchParams.get('status') // 'checked_in' or 'checked_out'

    console.log('Police Report API Request params:', { fromDate, toDate, status })

    // Validate status parameter
    if (!status || !['checked_in', 'checked_out'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status parameter. Must be "checked_in" or "checked_out"' },
        { status: 400 }
      )
    }

    // Validate date parameters
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Both fromDate and toDate parameters are required' },
        { status: 400 }
      )
    }

    // Build from booking_rooms with joins to bookings and rooms
    const baseSelect = `
      id,
      room_id,
      check_in_date,
      check_out_date,
      actual_check_in,
      actual_check_out,
      room_status,
      bookings:booking_id(
        id,
        booking_number,
        number_of_guests,
        extra_guests,
        child_guests,
        purpose,
        guest_id
      ),
      rooms:room_id(
        id,
        number,
        room_type_id,
        room_types:room_type_id(name)
      )
    `

    let brQuery = supabase.from('booking_rooms').select(baseSelect)

    if (status === 'checked_in') {
      brQuery = brQuery
        .gte('actual_check_in::date', fromDate as string)
        .lte('actual_check_in::date', toDate as string)
        .not('actual_check_in', 'is', null)
        .in('room_status', ['checked_in'])
        .order('actual_check_in', { ascending: false })
    } else {
      brQuery = brQuery
        .gte('actual_check_out::date', fromDate as string)
        .lte('actual_check_out::date', toDate as string)
        .not('actual_check_out', 'is', null)
        .order('actual_check_out', { ascending: false })
    }

    const { data: reportData, error: reportError } = await brQuery

    if (reportError) {
      console.error('Error fetching police report data:', reportError)
      return NextResponse.json({ error: 'Failed to fetch report data', details: reportError.message }, { status: 500 })
    }

    console.log(`Police report data fetched (status=${status}):`, reportData?.length || 0, 'records')

    // Get guest data for bookings
    let guestData: Record<string, any> = {}
    
    if (reportData && reportData.length > 0) {
      const guestIds = (reportData as any[])
        .map((r: any) => r.bookings?.guest_id)
        .filter(Boolean)
      
      if (guestIds.length > 0) {
        const { data: guests, error: guestError } = await supabase
          .from('guests')
          .select('id, name, phone, address')
          .in('id', guestIds)
        
        if (guestError) {
          console.error('Error fetching guests:', guestError)
        } else {
          guestData = (guests as any[]).reduce((acc: Record<string, any>, g: any) => {
            acc[g.id] = g
            return acc
          }, {})
        }
      }
    }

    // Process report data with joined information - flatten by room
    const reportList: any[] = []
    let sNo = 1
    
    reportData.forEach((br: any) => {
      const booking = br.bookings
      const guest = guestData[booking?.guest_id] || { name: 'Unknown Guest', phone: null, address: null }
      const room = br.rooms || { number: 'Unknown', room_types: { name: 'Unknown' } }

      const totalPax = (booking?.number_of_guests || 0) + (booking?.extra_guests || 0) + (booking?.child_guests || 0)

      reportList.push({
        id: `${booking?.id || 'unknown'}_${br.id}`,
        booking_id: booking?.id || null,
        s_no: sNo++,
        room_number: room.number,
        room_type: room.room_types?.name || 'Unknown',
        guest_name: guest.name,
        phone: guest.phone,
        address: guest.address,
        total_pax: totalPax,
        purpose: booking?.purpose || 'Not specified',
        check_in_time: br.actual_check_in || br.check_in_date,
        check_out_time: br.actual_check_out || br.check_out_date,
        booking_number: booking?.booking_number || 'N/A',
        // Room-specific data
        room_check_in: br.check_in_date,
        room_check_out: br.check_out_date,
        room_actual_check_in: br.actual_check_in,
        room_actual_check_out: br.actual_check_out,
        room_status: br.room_status
      })
    })

    console.log('API Response:', {
      status,
      recordCount: reportList.length
    })

    return NextResponse.json({
      success: true,
      data: reportList
    })

  } catch (error) {
    console.error('Error in police report API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
