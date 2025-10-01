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
    const threshold = Number(searchParams.get('threshold') || 5000)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const startDate = fromDate ? convertDateFormat(fromDate) : null
    const endDate = toDate ? convertDateFormat(toDate) : null

    const query = supabase
      .from('booking_payment_breakdown')
      .select('booking_id,total_amount,taxed_total_amount,outstanding_amount,bookings:booking_id(booking_number,created_at,guests:guest_id(name,phone))')
      .gt('outstanding_amount', threshold)

    if (startDate && endDate) {
      query.gte('bookings.created_at', `${startDate}T00:00:00`).lte('bookings.created_at', `${endDate}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to load high balance data' }, { status: 500 })
    }

    const results = (data || []).map((r: any) => ({
      booking_id: r.booking_id,
      booking_number: r.bookings?.booking_number,
      guest_name: r.bookings?.guests?.name,
      guest_phone: r.bookings?.guests?.phone,
      total_amount: Number(r.taxed_total_amount || r.total_amount || 0),
      outstanding_amount: Number(r.outstanding_amount || 0)
    }))

    return NextResponse.json({
      total: results.length,
      data: results,
      summary: { threshold }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


