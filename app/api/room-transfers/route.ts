import { NextRequest, NextResponse } from 'next/server'
import { RoomTransferService } from '@/lib/room-transfer-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromRoomId, toRoomId, bookingId, reason, transferStaffId, notifyGuest, notifyHousekeeping } = body

    // Validate required fields
    if (!fromRoomId || !toRoomId || !bookingId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: fromRoomId, toRoomId, bookingId, reason' },
        { status: 400 }
      )
    }

    // Process the transfer
    const result = await RoomTransferService.processTransfer({
      fromRoomId,
      toRoomId,
      bookingId,
      reason,
      transferStaffId,
      notifyGuest: notifyGuest || false,
      notifyHousekeeping: notifyHousekeeping || false
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          transferId: result.transferId,
          booking: result.booking,
          sourceRoom: result.sourceRoom,
          targetRoom: result.targetRoom
        }
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Room transfer API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (bookingId) {
      // Get transfer history for a specific booking
      const history = await RoomTransferService.getTransferHistory(bookingId)
      return NextResponse.json({ success: true, data: history })
    } else if (startDate && endDate) {
      // Get transfer statistics for a date range
      const statistics = await RoomTransferService.getTransferStatistics(
        new Date(startDate),
        new Date(endDate)
      )
      return NextResponse.json({ success: true, data: statistics })
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Room transfer GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
