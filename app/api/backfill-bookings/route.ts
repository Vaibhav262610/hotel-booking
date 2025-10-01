import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting backfill of existing bookings...')
    
    const result = await bookingService.backfillBookingTotals()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Backfill API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Backfill API endpoint. Use POST to run the backfill.',
    timestamp: new Date().toISOString()
  })
}
