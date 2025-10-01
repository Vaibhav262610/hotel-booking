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

    const { data: rows, error } = await supabase
      .from('booking_rooms')
      .select(`
        id, room_total, room_id,
        rooms:room_id(number, room_types:room_type_id(name))
      `)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)

    if (error) {
      return NextResponse.json({ error: 'Failed to load roomwise data' }, { status: 500 })
    }

    const byRoom: Record<string, { room: string; room_type: string; revenue: number; stays: number }> = {}
    ;(rows || []).forEach((r: any) => {
      const key = r.room_id
      const rt = (r.rooms?.room_types?.name) || 'Unknown'
      const rn = (r.rooms?.number) || 'N/A'
      if (!byRoom[key]) byRoom[key] = { room: rn, room_type: rt, revenue: 0, stays: 0 }
      byRoom[key].revenue += Number(r.room_total || 0)
      byRoom[key].stays += 1
    })

    const data = Object.values(byRoom)

    return NextResponse.json({
      total_rooms: data.length,
      data,
      summary: { period: `${fromDate} to ${toDate}` }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


