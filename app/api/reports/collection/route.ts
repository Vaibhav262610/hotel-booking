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

    const { data: txns, error } = await supabase
      .from('payment_transactions')
      .select('id, booking_id, amount, payment_method, transaction_type, created_at')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)

    if (error) {
      return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 })
    }

    const byMethod: Record<string, number> = {}
    let total = 0
    ;(txns || []).forEach((t: any) => {
      const amt = Number(t.amount || 0)
      total += amt
      const key = t.payment_method || 'unknown'
      byMethod[key] = (byMethod[key] || 0) + amt
    })

    return NextResponse.json({
      total_transactions: (txns || []).length,
      total_amount: total,
      by_method: byMethod,
      data: txns || [],
      summary: {
        period: `${fromDate} to ${toDate}`
      }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


