import { NextRequest, NextResponse } from 'next/server'
import { hotelService } from '@/lib/hotel-database'

export async function POST(request: NextRequest) {
  try {
    const { hotelId } = await request.json()

    if (!hotelId) {
      return NextResponse.json({ error: 'Hotel ID is required' }, { status: 400 })
    }

    const validHotels = ['hotel_001', 'hotel_002']
    if (!validHotels.includes(hotelId)) {
      return NextResponse.json({ error: 'Invalid hotel ID. Use hotel_001 or hotel_002' }, { status: 400 })
    }

    // Create hotel-specific tables
    const result = await hotelService.createHotelTables(hotelId)

    return NextResponse.json({
      message: `Tables created successfully for ${hotelId}`,
      hotelId,
      tables: [
        `${hotelId.replace('hotel_', 'hotel')}_staff`,
        `${hotelId.replace('hotel_', 'hotel')}_guests`,
        `${hotelId.replace('hotel_', 'hotel')}_room_types`,
        `${hotelId.replace('hotel_', 'hotel')}_rooms`,
        `${hotelId.replace('hotel_', 'hotel')}_bookings`,
        `${hotelId.replace('hotel_', 'hotel')}_booking_rooms`,
        `${hotelId.replace('hotel_', 'hotel')}_payment_breakdown`
      ]
    })

  } catch (error: any) {
    console.error('Error creating hotel tables:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
