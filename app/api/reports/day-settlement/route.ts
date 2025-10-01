import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { activeWhatsAppService, type DaySettlementReport } from '@/lib/whatsapp-service'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'

// This endpoint can be called by a cron job to automatically send day settlement reports
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, date } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Use provided date or default to yesterday
    const targetDate = date ? new Date(date) : subDays(new Date(), 1)
    const start = startOfDay(targetDate)
    const end = endOfDay(targetDate)

    // Fetch bookings for the target date
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        guest:guests(name, email, phone),
        staff:staff_id(name),
        room:rooms(number, type, price)
      `)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json(
        { message: 'No bookings found for the specified date' },
        { status: 200 }
      )
    }

    // Process day settlement data
    const paymentMethods: Record<string, number> = {}
    const staffPerformance: Record<string, number> = {}
    let totalRevenue = 0
    let walkinBookings = 0
    let onlineBookings = 0

    bookings.forEach(booking => {
      const amount = booking.total_amount || 0
      totalRevenue += amount
      
      // Count payment methods
      const paymentMethod = booking.payment_method || 'Cash'
      paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + amount
      
      // Count staff performance
      const staffName = booking.staff?.name || 'Unknown'
      staffPerformance[staffName] = (staffPerformance[staffName] || 0) + 1
      
      // Count booking types
      if (booking.arrival_type === 'walk-in' || !booking.arrival_type) {
        walkinBookings++
      } else {
        onlineBookings++
      }
    })

    // Prepare day settlement report
    const report: DaySettlementReport = {
      date: format(targetDate, "MMMM dd, yyyy"),
      totalBookings: bookings.length,
      totalRevenue,
      totalAdvance: bookings.reduce((sum, b) => sum + (b.advance_amount || 0), 0),
      totalRemaining: totalRevenue - bookings.reduce((sum, b) => sum + (b.advance_amount || 0), 0),
      walkinBookings,
      onlineBookings,
      paymentMethods,
      staffPerformance
    }

    // Send report via WhatsApp
    const formattedPhone = activeWhatsAppService.formatPhoneNumber(phoneNumber)
    const success = await activeWhatsAppService.sendDaySettlementReport(formattedPhone, report)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Day settlement report sent successfully',
        report: {
          date: report.date,
          totalBookings: report.totalBookings,
          totalRevenue: report.totalRevenue
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send WhatsApp message' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error generating day settlement report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to manually trigger report generation (for testing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phone')
    const date = searchParams.get('date')
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required as query parameter' },
        { status: 400 }
      )
    }

    // Call the POST method to generate and send the report
    const response = await POST(new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, date })
    }))

    return response

  } catch (error) {
    console.error('Error in GET request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
