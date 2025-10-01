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
    const mealPlan = searchParams.get('mealPlan') // Optional filter for specific meal plan

    console.log('Food Plan Report API Request params:', { fromDate, toDate, mealPlan })

    // Validate date parameters
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Both fromDate and toDate parameters are required' },
        { status: 400 }
      )
    }

    // Optional meal plan filter: resolve name -> id since filtering on joined alias is not supported
    let mealPlanId: string | null = null
    if (mealPlan && mealPlan !== 'all') {
      const { data: mp, error: mpErr } = await supabase
        .from('meal_plans')
        .select('id, name')
        .ilike('name', mealPlan)
        .limit(1)
        .maybeSingle()
      if (mpErr) {
        console.error('Error resolving meal plan id:', mpErr)
      } else {
        mealPlanId = mp?.id || null
      }
    }

    // Get booking_rooms for checked-in stays within date range; join bookings, rooms, meal_plans
    let brQuery = supabase
      .from('booking_rooms')
      .select(`
        id,
        room_id,
        check_in_date,
        check_out_date,
        actual_check_in,
        actual_check_out,
        room_status,
        meal_plan_id,
        bookings:booking_id(
          id,
          booking_number,
          number_of_guests,
          extra_guests,
          child_guests,
          guest_id,
          guests:guest_id(name)
        ),
        rooms:room_id(
          id,
          number,
          room_type_id,
          room_types:room_type_id(name)
        ),
        meal_plans:meal_plan_id(name)
      `)
      .gte('actual_check_in::date', fromDate as string)
      .lte('actual_check_in::date', toDate as string)
      .in('room_status', ['checked_in'])
      .order('actual_check_in', { ascending: false })

    // Apply meal plan filter if specified (by id)
    if (mealPlanId) {
      brQuery = brQuery.eq('meal_plan_id', mealPlanId)
    } else if (mealPlan && mealPlan !== 'all') {
      // No matching plan, return empty dataset
      return NextResponse.json({ success: true, data: [], summary: { total_guests: 0, meal_plans: {} } })
    }

    const { data: reportData, error: reportError } = await brQuery

    if (reportError) {
      console.error('Error fetching food plan report data:', reportError)
      return NextResponse.json({ error: 'Failed to fetch report data', details: reportError.message }, { status: 500 })
    }

    console.log(`Food plan report data fetched:`, reportData?.length || 0, 'records')

    // Guests are joined via bookings.guests; no extra fetch required

    // Process report data with joined information - flatten by room
    const reportList: any[] = []
    let sNo = 1
    
    reportData.forEach((br: any) => {
      const booking = br.bookings
      const room = br.rooms || { number: 'Unknown', room_types: { name: 'Unknown' } }
      const guestName = (booking as any)?.guests?.name || 'Unknown Guest'
      const totalPax = (booking?.number_of_guests || 0) + (booking?.extra_guests || 0) + (booking?.child_guests || 0)
      const mealPlanName = (br as any).meal_plans?.name || 'EP'

      reportList.push({
        id: `${booking?.id || 'unknown'}_${br.id}`,
        booking_id: booking?.id || null,
        s_no: sNo++,
        room_number: room.number,
        room_type: room.room_types?.name || 'Unknown',
        booking_number: booking?.booking_number || 'N/A',
        guest_name: guestName,
        checkin_date: br.actual_check_in || br.check_in_date,
        expected_checkout: br.check_out_date,
        meal_plan: mealPlanName,
        pax: booking?.number_of_guests || 0,
        extra_pax: booking?.extra_guests || 0,
        children: booking?.child_guests || 0,
        total_pax: totalPax,
        // Room-specific data
        room_check_in: br.check_in_date,
        room_check_out: br.check_out_date,
        room_actual_check_in: br.actual_check_in,
        room_actual_check_out: br.actual_check_out,
        room_status: br.room_status
      })
    })

    // Calculate summary metrics
    const summary = {
      total_guests: reportList.reduce((sum, r: any) => sum + (r.total_pax || 0), 0),
      meal_plans: {} as Record<string, number>
    }

    // Count by meal plan
    reportList.forEach((row: any) => {
      const plan = row.meal_plan || 'EP'
      summary.meal_plans[plan] = (summary.meal_plans[plan] || 0) + (row.total_pax || 0)
    })

    console.log('Food Plan Report API Response:', {
      recordCount: reportList.length,
      summary
    })

    return NextResponse.json({
      success: true,
      data: reportList,
      summary
    })

  } catch (error) {
    console.error('Error in food plan report API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
