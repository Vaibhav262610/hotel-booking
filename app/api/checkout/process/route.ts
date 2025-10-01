import { NextRequest, NextResponse } from 'next/server'
import { CheckoutService, CheckoutDetails } from '@/lib/checkout-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['bookingId', 'actualCheckOutDate']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Convert date string to Date object
    const checkoutDetails: CheckoutDetails = {
      ...body,
      actualCheckOutDate: new Date(body.actualCheckOutDate)
    }

    const result = await CheckoutService.processCheckout(checkoutDetails)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        isLateCheckout: result.isLateCheckout,
        lateFee: result.lateFee,
        gracePeriodUsed: result.gracePeriodUsed
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Checkout processing error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during checkout' 
      },
      { status: 500 }
    )
  }
}
