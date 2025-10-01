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

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        created_at,
        booking_payment_breakdown(total_amount,taxed_total_amount,receipt_cash,receipt_card,receipt_upi,receipt_bank)
      `)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)

    if (error) {
      return NextResponse.json({ error: 'Failed to load sales' }, { status: 500 })
    }

    let gross = 0
    let receipts = 0
    ;(bookings || []).forEach((b: any) => {
      const bp = b.booking_payment_breakdown || {}
      gross += Number(bp.taxed_total_amount || bp.total_amount || 0)
      receipts += Number(bp.receipt_cash || 0) + Number(bp.receipt_card || 0) + Number(bp.receipt_upi || 0) + Number(bp.receipt_bank || 0)
    })

    return NextResponse.json({
      total_bookings: (bookings || []).length,
      gross_sales: gross,
      total_receipts: receipts,
      data: bookings || [],
      summary: { period: `${fromDate} to ${toDate}` }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


