import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function convertDateFormat(dateStr: string): string {
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'fromDate and toDate parameters are required' }, { status: 400 })
    }

    const startDate = convertDateFormat(fromDate)
    const endDate = convertDateFormat(toDate)

    // Overlapping date condition: either actual_check_in OR actual_check_out in range
    const { data, error } = await supabase
      .from('booking_rooms')
      .select(`
        id,
        booking_id,
        check_in_date,
        check_out_date,
        actual_check_in,
        actual_check_out,
        rooms:room_id(number, room_types:room_type_id(name)),
        bookings:booking_id(status, booking_number, arrival_type, guests:guest_id(name, phone, nationality, passport_number, arrival_from))
      `)
      .or(`and(actual_check_in.gte.${startDate},actual_check_in.lte.${endDate}),and(actual_check_out.gte.${startDate},actual_check_out.lte.${endDate}),and(check_in_date.gte.${startDate},check_in_date.lte.${endDate}),and(check_out_date.gte.${startDate},check_out_date.lte.${endDate})`)
      .order('actual_check_in', { ascending: false })

    if (error) {
      console.error('Error fetching foreigner report data:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    const filtered = (data || []).filter((rec: any) => {
      const nat = (rec.bookings?.guests?.nationality || '').trim().toLowerCase()
      return nat && nat !== 'indian'
    })

    const rows = filtered.map((rec: any, idx: number) => ({
      s_no: idx + 1,
      booking_id: rec.booking_id,
      room_number: rec.rooms?.number || 'N/A',
      room_type: rec.rooms?.room_types?.name || 'N/A',
      status: rec.bookings?.status || 'N/A',
      guest_name: rec.bookings?.guests?.name || 'N/A',
      nationality: rec.bookings?.guests?.nationality || 'N/A',
      contact_number: rec.bookings?.guests?.phone || 'N/A',
      passport_number: rec.bookings?.guests?.passport_number || '',
      arrival_from: rec.bookings?.guests?.arrival_from || '',
      arrival_mode: rec.bookings?.arrival_type || '',
      actual_arrival_date: rec.actual_check_in,
      actual_check_out_date: rec.actual_check_out,
    }))

    return NextResponse.json({ success: true, total: rows.length, data: rows })
  } catch (error) {
    console.error('Error in foreigner-report API:', error)
    return NextResponse.json({ error: 'Failed to fetch data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}


