import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

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

    const startDate = convertDateFormat(fromDate)
    const endDate = convertDateFormat(toDate)

    // Build date list
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10))
    }

    // Total rooms
    const { data: allRooms, error: roomsErr } = await supabase
      .from('rooms')
      .select('id, status')

    if (roomsErr) {
      return NextResponse.json({ error: 'Failed to load rooms' }, { status: 500 })
    }
    const totalRooms = allRooms?.length || 0

    // Fetch booking_rooms in range
    const { data: br, error: brErr } = await supabase
      .from('booking_rooms')
      .select('id, check_in_date, check_out_date, actual_check_in, actual_check_out, room_id')
      .or(`and(check_in_date.gte.${startDate},check_in_date.lte.${endDate}),and(actual_check_in.gte.${startDate},actual_check_in.lte.${endDate})`)

    if (brErr) {
      return NextResponse.json({ error: 'Failed to load booking rooms' }, { status: 500 })
    }

    // For each day compute occupied rooms
    const data = days.map(day => {
      const dayStart = new Date(day + 'T00:00:00')
      const dayEnd = new Date(day + 'T23:59:59')
      const occupiedSet = new Set<string>()

      (br || []).forEach((row: any) => {
        // A room is occupied if the day falls between check_in and check_out (actual preferred)
        const ci = new Date(row.actual_check_in || row.check_in_date || day)
        const co = new Date(row.actual_check_out || row.check_out_date || day)
        if (ci <= dayEnd && co >= dayStart) {
          occupiedSet.add(String(row.room_id))
        }
      })

      const occupiedRooms = occupiedSet.size
      const occupancy = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

      return {
        date: day,
        occupied_rooms: occupiedRooms,
        total_rooms: totalRooms,
        occupancy_percentage: Number(occupancy.toFixed(2))
      }
    })

    const avg = data.length ? data.reduce((s, r) => s + r.occupancy_percentage, 0) / data.length : 0

    return NextResponse.json({
      total: data.length,
      data,
      summary: {
        average_occupancy: Number(avg.toFixed(2)),
        period: `${fromDate} to ${toDate}`
      }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


