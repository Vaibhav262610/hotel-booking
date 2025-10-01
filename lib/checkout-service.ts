import { supabase } from './supabase'
import { bookingService } from './supabase'

export interface CheckoutDetails {
  bookingId: string
  actualCheckOutDate: Date
  earlyCheckoutReason?: string
  priceAdjustment: number
  finalAmount: number
  adjustmentReason: string
  remainingBalance?: number
  remainingBalancePaymentMethod?: 'upi' | 'card' | 'cash' | 'bank'
  remainingBalanceCollectedBy?: string
  checkoutNotes?: string
  isGracePeriod?: boolean
  gracePeriodMinutes?: number
  lateCheckoutFee?: number
}

export interface CheckoutNotification {
  bookingId: string
  guestName: string
  roomNumber: string
  checkOutTime: Date
  notificationType: 'approaching' | 'overdue' | 'grace_period' | 'late_charges'
  message: string
}

export interface GracePeriodConfig {
  enabled: boolean
  durationMinutes: number
  lateFeePerHour: number
  maxLateFee: number
}

export class CheckoutService {
  private static readonly GRACE_PERIOD_CONFIG: GracePeriodConfig = {
    enabled: true,
    durationMinutes: 60, // 1 hour grace period
    lateFeePerHour: 100, // ₹100 per hour after grace period
    maxLateFee: 500 // Maximum ₹500 late fee
  }

  /**
   * Process guest checkout with comprehensive validation and fee calculation
   */
  static async processCheckout(checkoutDetails: CheckoutDetails): Promise<{
    success: boolean
    data?: any
    error?: string
    isLateCheckout?: boolean
    lateFee?: number
    gracePeriodUsed?: boolean
  }> {
    try {
      console.log('Processing checkout for booking:', checkoutDetails.bookingId)
      console.log('Checkout details:', checkoutDetails)

      // 1. Validate booking and get details
      const { data: booking, error: bookingError } = await supabase
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
            actual_check_out,
            room:room_id(id, number, room_type:room_type_id(name))
          )
        `)
        .eq('id', checkoutDetails.bookingId)
        .single()

      if (bookingError || !booking) {
        console.error('Booking query error:', bookingError)
        throw new Error(`Booking not found: ${bookingError?.message}`)
      }

      console.log('Found booking:', {
        id: booking.id,
        status: booking.status,
        booking_number: booking.booking_number,
        guest_name: booking.guest?.name
      })

      // Allow checkout if booking is checked_in or confirmed (in case of manual check-in without status update)
      if (!['checked_in', 'confirmed'].includes(booking.status)) {
        throw new Error(`Booking cannot be checked out. Current status: ${booking.status}. Only 'checked_in' or 'confirmed' bookings can be checked out.`)
      }

      // 2. Calculate checkout timing and fees
      // Get the expected checkout from the first booking room (since expected_checkout was moved to booking_rooms)
      const scheduledCheckOut = new Date(booking.booking_rooms?.[0]?.check_out_date || new Date())
      const actualCheckOut = checkoutDetails.actualCheckOutDate
      const isLateCheckout = actualCheckOut > scheduledCheckOut
      
      let lateFee = 0
      let gracePeriodUsed = false

      if (isLateCheckout) {
        const lateMinutes = Math.floor((actualCheckOut.getTime() - scheduledCheckOut.getTime()) / (1000 * 60))
        
        if (this.GRACE_PERIOD_CONFIG.enabled && lateMinutes <= this.GRACE_PERIOD_CONFIG.durationMinutes) {
          gracePeriodUsed = true
          // Within grace period - no fee
        } else {
          // Calculate late fee
          const hoursLate = Math.ceil((lateMinutes - this.GRACE_PERIOD_CONFIG.durationMinutes) / 60)
          lateFee = Math.min(
            hoursLate * this.GRACE_PERIOD_CONFIG.lateFeePerHour,
            this.GRACE_PERIOD_CONFIG.maxLateFee
          )
        }
      }

      // 3. Update booking status and details
      const finalAmount = checkoutDetails.finalAmount + lateFee
      
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'checked_out',
          checkout_notes: checkoutDetails.checkoutNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', checkoutDetails.bookingId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update booking: ${updateError.message}`)
      }

      // 3.5. Update booking_payment_breakdown with final amount and adjustments
      const { error: breakdownError } = await supabase
        .from('booking_payment_breakdown')
        .update({
          total_amount: finalAmount,
          price_adjustment: checkoutDetails.priceAdjustment, // This is now in the breakdown table
          taxed_total_amount: finalAmount, // Update the final taxed amount
          outstanding_amount: checkoutDetails.remainingBalance || 0,
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', checkoutDetails.bookingId)

      if (breakdownError) {
        console.error('Payment breakdown update error:', breakdownError)
        throw new Error(`Failed to update payment breakdown: ${breakdownError.message}`)
      }

      // 4. Update booking_rooms status
      const { error: bookingRoomsError } = await supabase
        .from('booking_rooms')
        .update({
          room_status: 'checked_out',
          actual_check_out: actualCheckOut.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', checkoutDetails.bookingId)

      if (bookingRoomsError) {
        console.error('Booking rooms update error:', bookingRoomsError)
        throw new Error(`Failed to update booking rooms: ${bookingRoomsError.message}`)
      }

      // 5. Update room statuses to available
      for (const bookingRoom of booking.booking_rooms) {
        const { error: roomUpdateError } = await supabase
          .from('rooms')
          .update({
            status: 'available',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingRoom.room_id)

        if (roomUpdateError) {
          console.error(`Room update error for room ${bookingRoom.room_id}:`, roomUpdateError)
          // Continue with other rooms even if one fails
        }
      }

      // 6. Record late checkout fee if applicable
      if (lateFee > 0) {
        await supabase
          .from('late_checkout_charges')
          .insert({
            booking_id: checkoutDetails.bookingId,
            original_amount: checkoutDetails.finalAmount,
            late_checkout_fee: lateFee,
            total_amount: finalAmount,
            reason: `Late checkout fee: ${Math.ceil((actualCheckOut.getTime() - scheduledCheckOut.getTime()) / (1000 * 60))} minutes late`
          })
      }

      // 7. Create grace period record if used
      if (gracePeriodUsed) {
        await supabase
          .from('grace_period_tracker')
          .insert({
            booking_id: checkoutDetails.bookingId,
            original_check_out: scheduledCheckOut.toISOString(),
            grace_period_start: scheduledCheckOut.toISOString(),
            grace_period_end: new Date(scheduledCheckOut.getTime() + this.GRACE_PERIOD_CONFIG.durationMinutes * 60000).toISOString(),
            late_charges: 0,
            is_active: false
          })
      }

      // 8. Record remaining balance payment if applicable
      if (checkoutDetails.remainingBalance && checkoutDetails.remainingBalance > 0) {
        await supabase
          .from('payment_transactions')
          .insert({
            booking_id: checkoutDetails.bookingId,
            amount: checkoutDetails.remainingBalance,
            payment_method: checkoutDetails.remainingBalancePaymentMethod || 'cash',
            transaction_type: 'receipt',
            collected_by: checkoutDetails.remainingBalanceCollectedBy,
            notes: 'Final payment at checkout',
            transaction_date: new Date().toISOString(),
            status: 'completed'
          })
      }

      // 9. Create checkout notification record
      await this.createCheckoutNotification({
        bookingId: checkoutDetails.bookingId,
        guestName: booking.guest.name,
        roomNumber: booking.booking_rooms[0]?.room?.number || 'Unknown',
        checkOutTime: actualCheckOut,
        notificationType: isLateCheckout ? (gracePeriodUsed ? 'grace_period' : 'late_charges') : 'approaching',
        message: isLateCheckout 
          ? `Guest checked out ${Math.ceil((actualCheckOut.getTime() - scheduledCheckOut.getTime()) / (1000 * 60))} minutes late${lateFee > 0 ? ` with ₹${lateFee} late fee` : ' within grace period'}`
          : 'Guest checked out on time'
      })

      // 10. Log staff action
      if (checkoutDetails.remainingBalanceCollectedBy) {
        await supabase
          .from('staff_logs')
          .insert({
            hotel_id: booking.hotel_id,
            staff_id: checkoutDetails.remainingBalanceCollectedBy,
            action: 'checkout_processed',
            details: `Processed checkout for booking ${booking.booking_number}. Final amount: ₹${finalAmount}${lateFee > 0 ? ` (including ₹${lateFee} late fee)` : ''}`,
            ip_address: '127.0.0.1'
          })
      }

      return {
        success: true,
        data: updatedBooking,
        isLateCheckout,
        lateFee,
        gracePeriodUsed
      }

    } catch (error) {
      console.error('Checkout processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during checkout'
      }
    }
  }

  /**
   * Create checkout notification
   */
  static async createCheckoutNotification(notification: CheckoutNotification): Promise<void> {
    try {
      await supabase
        .from('checkout_notifications')
        .insert({
          booking_id: notification.bookingId,
          guest_name: notification.guestName,
          room_number: notification.roomNumber,
          check_out_time: notification.checkOutTime.toISOString(),
          notification_type: notification.notificationType,
          message: notification.message,
          is_active: true
        })
    } catch (error) {
      console.error('Failed to create checkout notification:', error)
    }
  }

  /**
   * Get active checkout alerts for dashboard
   */
  static async getActiveCheckoutAlerts(): Promise<CheckoutNotification[]> {
    try {
      const { data, error } = await supabase
        .from('active_checkout_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to fetch checkout alerts:', error)
      return []
    }
  }

  /**
   * Dismiss checkout notification
   */
  static async dismissNotification(notificationId: string, dismissedBy: string): Promise<void> {
    try {
      await supabase
        .from('checkout_notifications')
        .update({
          is_active: false,
          dismissed_at: new Date().toISOString(),
          dismissed_by: dismissedBy
        })
        .eq('id', notificationId)
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  /**
   * Get checkout statistics
   */
  static async getCheckoutStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalCheckouts: number
    onTimeCheckouts: number
    lateCheckouts: number
    gracePeriodUsed: number
    totalLateFees: number
    averageLateTime: number
  }> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const end = endDate || new Date()

      const { data, error } = await supabase
        .rpc('get_checkout_statistics', {
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0]
        })

      if (error) throw error

      return {
        totalCheckouts: data?.[0]?.total_notifications || 0,
        onTimeCheckouts: (data?.[0]?.total_notifications || 0) - (data?.[0]?.overdue_count || 0),
        lateCheckouts: data?.[0]?.overdue_count || 0,
        gracePeriodUsed: data?.[0]?.grace_period_count || 0,
        totalLateFees: data?.[0]?.total_late_fees || 0,
        averageLateTime: data?.[0]?.average_grace_period_hours || 0
      }
    } catch (error) {
      console.error('Failed to get checkout statistics:', error)
      return {
        totalCheckouts: 0,
        onTimeCheckouts: 0,
        lateCheckouts: 0,
        gracePeriodUsed: 0,
        totalLateFees: 0,
        averageLateTime: 0
      }
    }
  }

  /**
   * Get bookings approaching checkout time
   */
  static async getApproachingCheckouts(hoursAhead: number = 2): Promise<any[]> {
    try {
      const targetTime = new Date()
      targetTime.setHours(targetTime.getHours() + hoursAhead)

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guest_id(name, email, phone),
          booking_rooms(
            id,
            room_id,
            room_status,
            check_out_date,
            room:room_id(id, number, room_type:room_type_id(name))
          )
        `)
        .eq('status', 'checked_in')
        .lte('expected_checkout', targetTime.toISOString().split('T')[0])
        .gte('expected_checkout', new Date().toISOString().split('T')[0])

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to fetch approaching checkouts:', error)
      return []
    }
  }

  /**
   * Process automated checkout notifications (should be called by cron job)
   */
  static async processAutomatedNotifications(): Promise<void> {
    try {
      const now = new Date()
      const approachingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours ahead
      const overdueTime = new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago

      // Get approaching checkouts
      const approachingCheckouts = await this.getApproachingCheckouts(2)
      
      for (const booking of approachingCheckouts) {
        // Check if notification already exists
        const { data: existingNotification } = await supabase
          .from('checkout_notifications')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('notification_type', 'approaching')
          .eq('is_active', true)
          .single()

        if (!existingNotification) {
          await this.createCheckoutNotification({
            bookingId: booking.id,
            guestName: booking.guest.name,
            roomNumber: booking.booking_rooms[0]?.room?.number || 'Unknown',
            checkOutTime: new Date(booking.expected_checkout),
            notificationType: 'approaching',
            message: `Guest ${booking.guest.name} in room ${booking.booking_rooms[0]?.room?.number || 'Unknown'} has checkout approaching in 2 hours`
          })
        }
      }

      // Handle overdue checkouts
      const { data: overdueBookings, error: overdueError } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guest_id(name),
          booking_rooms(
            id,
            room_id,
            room:room_id(number)
          )
        `)
        .eq('status', 'checked_in')
        .lt('expected_checkout', now.toISOString().split('T')[0])

      if (!overdueError && overdueBookings) {
        for (const booking of overdueBookings) {
          await this.createCheckoutNotification({
            bookingId: booking.id,
            guestName: booking.guest.name,
            roomNumber: booking.booking_rooms[0]?.room?.number || 'Unknown',
            checkOutTime: new Date(booking.expected_checkout),
            notificationType: 'overdue',
            message: `Guest ${booking.guest.name} in room ${booking.booking_rooms[0]?.room?.number || 'Unknown'} is overdue for checkout`
          })
        }
      }

    } catch (error) {
      console.error('Failed to process automated notifications:', error)
    }
  }
}

export default CheckoutService
