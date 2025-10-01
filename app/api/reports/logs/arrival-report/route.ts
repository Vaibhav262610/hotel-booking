import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate and toDate are required' },
        { status: 400 }
      )
    }

    // Supabase client is already created above

    // Convert dates to proper format for PostgreSQL
    const startDate = fromDate // Already in YYYY-MM-DD format
    const endDate = toDate // Already in YYYY-MM-DD format

    // First, get bookings with basic info
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        actual_check_in,
        arrival_type,
        ota_company,
        meal_plan,
        updated_at,
        staff_id,
        guest_id
      `)
      .gte('actual_check_in::date', startDate)
      .lte('actual_check_in::date', endDate)
      .not('actual_check_in', 'is', null)
      .order('actual_check_in', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch bookings data' },
        { status: 500 }
      )
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0
      })
    }

    // Get guest information
    const guestIds = [...new Set(bookings.map(b => b.guest_id).filter(Boolean))]
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select(`
        id, 
        name, 
        address
      `)
      .in('id', guestIds)

    if (guestsError) {
      console.error('Error fetching guests:', guestsError)
      return NextResponse.json(
        { error: 'Failed to fetch guests data' },
        { status: 500 }
      )
    }

    // Get staff information
    const staffIds = [...new Set(bookings.map(b => b.staff_id).filter(Boolean))]
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name')
      .in('id', staffIds)

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json(
        { error: 'Failed to fetch staff data' },
        { status: 500 }
      )
    }

    // Get booking rooms
    const bookingIds = bookings.map(b => b.id)
    const { data: bookingRooms, error: bookingRoomsError } = await supabase
      .from('booking_rooms')
      .select(`
        id,
        booking_id,
        room_id,
        actual_check_in,
        actual_check_out,
        updated_at
      `)
      .in('booking_id', bookingIds)

    if (bookingRoomsError) {
      console.error('Error fetching booking rooms:', bookingRoomsError)
      return NextResponse.json(
        { error: 'Failed to fetch booking rooms data' },
        { status: 500 }
      )
    }

    // Get rooms information
    const roomIds = [...new Set(bookingRooms?.map(br => br.room_id).filter(Boolean) || [])]
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        id,
        number,
        room_type_id
      `)
      .in('id', roomIds)

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      return NextResponse.json(
        { error: 'Failed to fetch rooms data' },
        { status: 500 }
      )
    }

    // Get room types
    const roomTypeIds = [...new Set(rooms?.map(r => r.room_type_id).filter(Boolean) || [])]
    const { data: roomTypes, error: roomTypesError } = await supabase
      .from('room_types')
      .select('id, name')
      .in('id', roomTypeIds)

    if (roomTypesError) {
      console.error('Error fetching room types:', roomTypesError)
      return NextResponse.json(
        { error: 'Failed to fetch room types data' },
        { status: 500 }
      )
    }

    // Create lookup maps for efficient data joining
    const guestsMap = new Map(guests?.map(g => [g.id, g]) || [])
    const staffMap = new Map(staff?.map(s => [s.id, s]) || [])
    const roomsMap = new Map(rooms?.map(r => [r.id, r]) || [])
    const roomTypesMap = new Map(roomTypes?.map(rt => [rt.id, rt]) || [])
    const bookingRoomsMap = new Map()
    
    // Group booking rooms by booking_id
    bookingRooms?.forEach(br => {
      if (!bookingRoomsMap.has(br.booking_id)) {
        bookingRoomsMap.set(br.booking_id, [])
      }
      bookingRoomsMap.get(br.booking_id).push(br)
    })

    // Transform data to match the required structure
    const transformedData = bookings.map(booking => {
      const guest = guestsMap.get(booking.guest_id)
      const staffMember = staffMap.get(booking.staff_id)
      const bookingRoomsList = bookingRoomsMap.get(booking.id) || []

      return {
        // Row 1: Booking Header
        booking_number: booking.booking_number,
        guest_name: guest?.name || '',
        checkin_date: booking.actual_check_in,
        
        // Row 2: Booking Details
        arrival_type: booking.arrival_type || '',
        ota_company: booking.ota_company || '',
        staff_name: staffMember?.name || '',
        last_updated_time: booking.updated_at,
        
        // Row 3+: Room Details (multiple rows per booking)
        rooms: bookingRoomsList.map(room => {
          const roomInfo = roomsMap.get(room.room_id)
          const roomType = roomInfo ? roomTypesMap.get(roomInfo.room_type_id) : null

          return {
            room_type: roomType?.name || '',
            room_number: roomInfo?.number || '',
            plan_name: booking.meal_plan || '',
            actual_checkin_time: room.actual_check_in,
            actual_checkout_time: room.actual_check_out,
            grace_time: '01:00:00', // Default grace time until migration is applied
            guest_address: guest?.address || '',
            current_staff: staffMember?.name || '', // Use booking staff until assigned_staff_id is available
            last_updated_date: room.updated_at
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedData,
      total: transformedData.length
    })

  } catch (error) {
    console.error('Error in arrival log API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
