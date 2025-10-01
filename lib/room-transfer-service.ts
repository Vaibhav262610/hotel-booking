import { supabase } from './supabase'
import { roomService } from './supabase'
import { TransferNotificationService } from './transfer-notification-service'

export interface RoomTransferRequest {
  fromRoomId: string
  toRoomId: string
  bookingId: string
  reason: string
  transferStaffId?: string
  notifyGuest?: boolean
  notifyHousekeeping?: boolean
}

export interface RoomTransferResult {
  success: boolean
  message: string
  transferId?: string
  booking?: any
  sourceRoom?: any
  targetRoom?: any
  transferRecord?: any
  error?: string
}

export interface AvailableRoom {
  id: string
  number: string
  room_type_id: string
  status: string
  room_type: {
    name: string
    code: string
    base_price: number
  }
}

export interface TransferHistory {
  id: string
  transfer_date: string
  reason: string
  from_room: { number: string }
  to_room: { number: string }
  transfer_staff: { name: string }
}

export class RoomTransferService {
  private static readonly TRANSFER_REASONS = [
    "Guest request",
    "Room maintenance required",
    "Room upgrade",
    "Room downgrade", 
    "Noise complaint",
    "Room service issue",
    "Plumbing issue",
    "Electrical issue",
    "AC/Heating issue",
    "Housekeeping issue",
    "Guest preference",
    "Operational requirement",
    "Other"
  ]

  /**
   * Process a room transfer with comprehensive validation and logging
   */
  static async processTransfer(request: RoomTransferRequest): Promise<RoomTransferResult> {
    try {
      console.log('Processing room transfer:', request)

      // Validate request
      const validation = await this.validateTransferRequest(request)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Execute the transfer
      const result = await roomService.transferRoom(
        request.fromRoomId,
        request.toRoomId,
        request.bookingId,
        request.reason,
        request.transferStaffId
      )

      // Send notifications if requested
      if (request.notifyGuest || request.notifyHousekeeping) {
        await this.sendTransferNotifications(result, request)
      }

      return {
        success: true,
        message: result.message,
        transferId: result.transferId,
        booking: result.booking,
        sourceRoom: result.sourceRoom,
        targetRoom: result.targetRoom,
        transferRecord: result.transferRecord
      }

    } catch (error) {
      console.error('Room transfer error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during transfer'
      }
    }
  }

  /**
   * Get available rooms for transfer
   */
  static async getAvailableRooms(bookingId: string, excludeRoomId?: string): Promise<AvailableRoom[]> {
    try {
      return await roomService.getAvailableRoomsForTransfer(bookingId, excludeRoomId)
    } catch (error) {
      console.error('Error getting available rooms:', error)
      throw error
    }
  }

  /**
   * Get transfer history for a booking
   */
  static async getTransferHistory(bookingId: string): Promise<TransferHistory[]> {
    try {
      return await roomService.getTransferHistory(bookingId)
    } catch (error) {
      console.error('Error getting transfer history:', error)
      throw error
    }
  }

  /**
   * Get booking details for transfer
   */
  static async getBookingForTransfer(bookingId: string) {
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guest_id(name, email, phone),
          staff:staff_id(name),
          booking_rooms(
            id,
            room_id,
            room_status,
            check_in_date,
            check_out_date,
            actual_check_in,
            room:room_id(id, number, room_type:room_type_id(name, code, base_price))
          )
        `)
        .eq('id', bookingId)
        .single()

      if (error) throw error
      return booking
    } catch (error) {
      console.error('Error getting booking for transfer:', error)
      throw error
    }
  }

  /**
   * Get transfer reasons
   */
  static getTransferReasons(): string[] {
    return [...this.TRANSFER_REASONS]
  }

  /**
   * Validate transfer request
   */
  private static async validateTransferRequest(request: RoomTransferRequest): Promise<{
    valid: boolean
    error?: string
  }> {
    try {
      // Basic validation
      if (!request.fromRoomId || !request.toRoomId || !request.bookingId) {
        return { valid: false, error: 'Missing required fields' }
      }

      if (request.fromRoomId === request.toRoomId) {
        return { valid: false, error: 'Source and target rooms cannot be the same' }
      }

      if (!request.reason || request.reason.trim() === '') {
        return { valid: false, error: 'Transfer reason is required' }
      }

      // Get booking details
      const booking = await this.getBookingForTransfer(request.bookingId)
      if (!booking) {
        return { valid: false, error: 'Booking not found' }
      }

      // Check booking status
      if (!['confirmed', 'checked_in'].includes(booking.status)) {
        return { valid: false, error: `Cannot transfer booking with status: ${booking.status}` }
      }

      // Check if source room is associated with booking
      const sourceBookingRoom = booking.booking_rooms?.find(br => br.room_id === request.fromRoomId)
      if (!sourceBookingRoom) {
        return { valid: false, error: 'Source room is not associated with this booking' }
      }

      // Check target room availability
      const { data: targetRoom, error: targetError } = await supabase
        .from('rooms')
        .select('id, number, status')
        .eq('id', request.toRoomId)
        .single()

      if (targetError || !targetRoom) {
        return { valid: false, error: 'Target room not found' }
      }

      if (targetRoom.status !== 'available') {
        return { valid: false, error: `Room ${targetRoom.number} is not available (Status: ${targetRoom.status})` }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Validation error' }
    }
  }

  /**
   * Send transfer notifications
   */
  private static async sendTransferNotifications(result: any, request: RoomTransferRequest): Promise<void> {
    try {
      const transferData = {
        guestName: result.booking?.guest?.name || 'Guest',
        bookingNumber: result.booking?.booking_number || 'N/A',
        fromRoom: result.sourceRoom?.number || 'N/A',
        toRoom: result.targetRoom?.number || 'N/A',
        transferDate: new Date().toLocaleString(),
        reason: request.reason || 'Not specified',
        staffName: 'Staff Member', // This should be fetched from staff service
        roomType: result.targetRoom?.room_type?.name || 'N/A',
        guestEmail: request.notifyGuest ? result.booking?.guest?.email : undefined,
        transferId: result.transferId || '',
        bookingId: request.bookingId
      }

      await TransferNotificationService.sendTransferNotifications(transferData)
    } catch (error) {
      console.warn('Failed to send transfer notifications:', error)
    }
  }

  /**
   * Get room transfer statistics
   */
  static async getTransferStatistics(startDate?: Date, endDate?: Date) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const end = endDate || new Date()

      const { data, error } = await supabase
        .from('room_transfers')
        .select(`
          id,
          transfer_date,
          reason,
          from_room:from_room_id(number),
          to_room:to_room_id(number)
        `)
        .gte('transfer_date', start.toISOString())
        .lte('transfer_date', end.toISOString())

      if (error) throw error

      const transfers = data || []
      const reasonCounts = transfers.reduce((acc, transfer) => {
        acc[transfer.reason] = (acc[transfer.reason] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalTransfers: transfers.length,
        transfersByReason: reasonCounts,
        transfers: transfers
      }
    } catch (error) {
      console.error('Error getting transfer statistics:', error)
      throw error
    }
  }
}

export default RoomTransferService
