import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

function normalizeDateParam(dateStr: string | null): string | null {
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
    const fromDateRaw = searchParams.get('fromDate')
    const toDateRaw = searchParams.get('toDate')
    const fromDate = normalizeDateParam(fromDateRaw)
    const toDate = normalizeDateParam(toDateRaw)
    const includeMobileNumber = searchParams.get('includeMobileNumber') === 'true'
    const includeTariff = searchParams.get('includeTariff') === 'true'

    console.log('API Request params:', { fromDate, toDate, includeMobileNumber, includeTariff })

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'fromDate and toDate are required' }, { status: 400 })
    }

    // OCCUPANCY: derive from booking_rooms overlapping the window and with active/checked-in status
    const { data: occupancyRooms, error: occupancyError } = await supabase
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
          number_of_guests,
          extra_guests,
          child_guests,
          planned_nights,
          arrival_type,
          ota_company,
          guest_id,
          booking_payment_breakdown:booking_payment_breakdown(total_amount, outstanding_amount)
        ),
        rooms:room_id(
          id,
          number,
          room_type_id,
          room_types:room_type_id(name),
          floor
        )
      `)
      .lt('check_in_date', toDate)
      .gt('check_out_date', fromDate)
      .in('room_status', ['checked_in'])

    if (occupancyError) {
      console.error('Error fetching occupancy data:', occupancyError)
      return NextResponse.json({ error: 'Failed to fetch occupancy data', details: occupancyError.message }, { status: 500 })
    }

    console.log('Occupancy data fetched:', occupancyRooms?.length || 0, 'records')

    // Get guest data for occupancy bookings
    let guestData: Record<string, any> = {}
    
    if (occupancyRooms && occupancyRooms.length > 0) {
      const guestIds = (occupancyRooms as any[])
        .map(r => (r as any).bookings?.guest_id)
        .filter(Boolean)
      
      if (guestIds.length > 0) {
        const { data: guests, error: guestError } = await supabase
          .from('guests')
          .select('id, name, phone')
          .in('id', guestIds)
        
        if (guestError) {
          console.error('Error fetching guests:', guestError)
        } else {
          guestData = guests.reduce((acc, guest) => {
            acc[guest.id] = guest
            return acc
          }, {} as Record<string, any>)
        }
      }
    }

    // Get vacant rooms data
    // VACANT: rooms with maintenance_status = 'available' and not overlapping any booking_rooms in window
    const { data: allAvailableRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, number, room_type_id, room_types:room_type_id(name), floor, maintenance_status')
      .eq('maintenance_status', 'available')
      .order('number', { ascending: true })

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      return NextResponse.json({ error: 'Failed to fetch rooms', details: roomsError.message }, { status: 500 })
    }

    const { data: busyOverlap, error: busyErr } = await supabase
      .from('booking_rooms')
      .select('room_id')
      .lt('check_in_date', toDate)
      .gt('check_out_date', fromDate)
      .in('room_status', ['reserved','checked_in'])

    if (busyErr) {
      console.error('Error fetching busy rooms:', busyErr)
      return NextResponse.json({ error: 'Failed to compute vacant rooms', details: busyErr.message }, { status: 500 })
    }

    const busySet = new Set((busyOverlap || []).map((b: any) => b.room_id))
    const vacantData = (allAvailableRooms || []).filter((r: any) => !busySet.has(r.id))

    // Get blocked rooms data
    const { data: blockedData, error: blockedError } = await supabase
      .from('rooms')
      .select('number, room_type_id, room_types:room_type_id(name), updated_at')
      .eq('maintenance_status', 'blocked')
      .order('number', { ascending: true })

    if (blockedError) {
      console.error('Error fetching blocked rooms:', blockedError)
      return NextResponse.json({ error: 'Failed to fetch blocked rooms', details: blockedError.message }, { status: 500 })
    }

    // Get maintenance rooms count
    const { count: maintenanceCount, error: maintenanceError } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('maintenance_status', 'maintenance')

    if (maintenanceError) {
      console.error('Error fetching maintenance rooms count:', maintenanceError)
      return NextResponse.json({ error: 'Failed to fetch maintenance rooms count', details: maintenanceError.message }, { status: 500 })
    }

    // Process occupancy data with joined information - flatten by room
    const occupancyList: any[] = []
    let sNo = 1
    
    occupancyRooms.forEach((br: any) => {
      const booking = br.bookings
      if (!booking) return
      const guest = guestData[booking.guest_id] || { name: 'Unknown Guest', phone: null }
      const room = br.rooms || { number: 'Unknown', room_types: { name: 'Unknown' }, floor: null }

      occupancyList.push({
        id: `${booking.id}_${br.id}`,
        booking_id: booking.id,
        s_no: sNo++,
        room_number: room.number,
        room_type: room.room_types?.name || 'Unknown',
        guest_name: guest.name,
        mobile: includeMobileNumber ? guest.phone : null,
        meal_plan: 'EP',
        plan_name: 'STD',
        arrival_type: booking.arrival_type || 'Walk-In',
        company_ota_agent: booking.ota_company || 'N/A',
        booking_number: booking.booking_number,
        pax: booking.number_of_guests || 0,
        extra_pax: booking.extra_guests || 0,
        child_pax: booking.child_guests || 0,
        total_pax: (booking.number_of_guests || 0) + (booking.extra_guests || 0) + (booking.child_guests || 0),
        tariff: includeTariff ? (booking as any).booking_payment_breakdown?.total_amount ?? null : null,
        checkin_date: br.actual_check_in || br.check_in_date,
        expected_checkout: br.check_out_date,
        planned_nights: booking.planned_nights || 1,
        // Room-specific data
        room_check_in: br.check_in_date,
        room_check_out: br.check_out_date,
        room_actual_check_in: br.actual_check_in,
        room_actual_check_out: br.actual_check_out,
        room_status: br.room_status
      })
    })

    // Process vacant data - group by room type
    const vacantByType = (vacantData || []).reduce((acc, room) => {
      const roomType = (room.room_types as any)?.name || 'Unknown'
      if (!acc[roomType]) {
        acc[roomType] = {
          room_type: roomType,
          total_rooms: 0,
          room_numbers: []
        }
      }
      acc[roomType].total_rooms++
      acc[roomType].room_numbers.push(room.number)
      return acc
    }, {} as Record<string, { room_type: string; total_rooms: number; room_numbers: string[] }>)

    const vacantList = Object.values(vacantByType).map(item => ({
      ...item,
      room_numbers_str: item.room_numbers.join(', ')
    }))

    // Process blocked data
    const blockedList = (blockedData || []).map((room, index) => ({
      id: room.number,
      s_no: index + 1,
      room_number: room.number,
      room_type: (room.room_types as any)?.name || 'Unknown',
      blocked_on: room.updated_at
    }))

    // Calculate metrics
    const metrics = {
      occupancy: {
        number_of_rooms: occupancyList.length,
        total_pax: occupancyList.reduce((sum, booking) => sum + booking.total_pax, 0)
      },
      vacant: {
        number_of_vacant: vacantData?.length || 0,
        maintenance: maintenanceCount || 0
      }
    }

    // If no data, return empty arrays with proper structure
    if (occupancyList.length === 0 && vacantList.length === 0) {
      console.log('No data found, returning empty structure')
      return NextResponse.json({
        success: true,
        data: {
          occupancy: [],
          vacant: [],
          blocked: [],
          metrics: {
            occupancy: { number_of_rooms: 0, total_pax: 0 },
            vacant: { number_of_vacant: 0, maintenance: 0 }
          }
        }
      })
    }

    console.log('API Response:', {
      occupancyCount: occupancyList.length,
      vacantCount: vacantList.length,
      blockedCount: blockedList.length,
      metrics
    })

    return NextResponse.json({
      success: true,
      data: {
        occupancy: occupancyList,
        vacant: vacantList,
        blocked: blockedList,
        metrics
      }
    })

  } catch (error) {
    console.error('Error in occupancy-vacant API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
