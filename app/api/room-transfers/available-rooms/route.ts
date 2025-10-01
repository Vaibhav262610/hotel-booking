import { NextRequest, NextResponse } from 'next/server'
import { RoomTransferService } from '@/lib/room-transfer-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const excludeRoomId = searchParams.get('excludeRoomId')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId parameter is required' },
        { status: 400 }
      )
    }

    const availableRooms = await RoomTransferService.getAvailableRooms(bookingId, excludeRoomId || undefined)
    
    return NextResponse.json({
      success: true,
      data: availableRooms,
      count: availableRooms.length
    })
  } catch (error) {
    console.error('Available rooms API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
