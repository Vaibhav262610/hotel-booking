import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabasePublic, supabaseAdmin } from '@/lib/supabase'
const supabase = (supabaseAdmin as any) || supabasePublic

// Convert DD/MM/YYYY to YYYY-MM-DD for database queries (accept ISO)
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
      return NextResponse.json(
        { error: 'fromDate and toDate parameters are required' },
        { status: 400 }
      )
    }

    const startDate = convertDateFormat(fromDate)
    const endDate = convertDateFormat(toDate)

    const { data, error } = await supabase
      .from('room_transfers')
      .select(`
        id,
        transfer_date,
        reason,
        bookings:booking_id(
          booking_number,
          status,
          guests:guest_id(name)
        ),
        from_room:from_room_id(number),
        to_room:to_room_id(number),
        transfer_staff:transfer_staff_id(name)
      `)
      .gte('transfer_date::date', startDate)
      .lte('transfer_date::date', endDate)
      .order('transfer_date', { ascending: false })

    if (error) {
      console.error('Error fetching room transfers:', error)
      return NextResponse.json({ error: 'Failed to fetch room transfers' }, { status: 500 })
    }

    const rows = (data || []).map((rec: any, idx: number) => ({
      s_no: idx + 1,
      booking_number: rec.bookings?.booking_number || 'N/A',
      checkin_date: null,
      guest_name: rec.bookings?.guests?.name || 'N/A',
      from_room: rec.from_room?.number || 'N/A',
      to_room: rec.to_room?.number || 'N/A',
      transfer_date: rec.transfer_date,
      reason: rec.reason || '',
      checked_in_by: 'N/A',
      transfer_by: rec.transfer_staff?.name || 'N/A',
      status: rec.bookings?.status || 'N/A'
    }))

    return NextResponse.json({ success: true, data: rows, total: rows.length })
  } catch (error) {
    console.error('Error in rooms-transfers API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room transfers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


