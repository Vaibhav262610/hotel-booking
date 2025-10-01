import { NextRequest, NextResponse } from 'next/server'
import { CheckoutService } from '@/lib/checkout-service'

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by a cron job or scheduled task
    // to process automated checkout notifications
    
    await CheckoutService.processAutomatedNotifications()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Automated notifications processed successfully' 
    })
  } catch (error) {
    console.error('Failed to process automated notifications:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const alerts = await CheckoutService.getActiveCheckoutAlerts()
    
    return NextResponse.json({ 
      success: true, 
      data: alerts 
    })
  } catch (error) {
    console.error('Failed to fetch checkout alerts:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
