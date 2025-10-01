import { supabase } from './supabase'
import { emailService } from './supabase'

export interface TransferNotification {
  id?: string
  type: 'guest_notification' | 'housekeeping_notification' | 'management_notification'
  recipient: string
  subject: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  transfer_id?: string
  booking_id?: string
  created_at?: string
  sent_at?: string
}

export interface TransferNotificationTemplate {
  guest: {
    subject: string
    message: string
  }
  housekeeping: {
    subject: string
    message: string
  }
  management: {
    subject: string
    message: string
  }
}

export class TransferNotificationService {
  private static readonly NOTIFICATION_TEMPLATES: TransferNotificationTemplate = {
    guest: {
      subject: "Room Transfer Notification - Hotel Management System",
      message: `
Dear {guestName},

We would like to inform you that your room has been transferred as requested.

Transfer Details:
- From Room: {fromRoom}
- To Room: {toRoom}
- Transfer Date: {transferDate}
- Reason: {reason}
- New Room Type: {roomType}

Please collect your new room key from the front desk if you haven't already done so.

If you have any questions or concerns, please don't hesitate to contact our front desk.

Thank you for your understanding.

Best regards,
Hotel Management Team
      `.trim()
    },
    housekeeping: {
      subject: "Room Transfer - Housekeeping Update Required",
      message: `
Housekeeping Team,

A room transfer has been completed and requires your attention:

Transfer Details:
- Guest: {guestName}
- From Room: {fromRoom}
- To Room: {toRoom}
- Transfer Date: {transferDate}
- Reason: {reason}

Action Required:
1. Clean and prepare the vacated room ({fromRoom}) for next guest
2. Ensure the new room ({toRoom}) is properly serviced
3. Update room status in the system

Please confirm completion of these tasks.

Hotel Management System
      `.trim()
    },
    management: {
      subject: "Room Transfer Report - Management Notification",
      message: `
Management Team,

A room transfer has been completed:

Transfer Details:
- Guest: {guestName}
- Booking Number: {bookingNumber}
- From Room: {fromRoom}
- To Room: {toRoom}
- Transfer Date: {transferDate}
- Reason: {reason}
- Transferred By: {staffName}

This transfer has been logged in the system for audit purposes.

Hotel Management System
      `.trim()
    }
  }

  /**
   * Send transfer notifications
   */
  static async sendTransferNotifications(transferData: {
    guestName: string
    bookingNumber: string
    fromRoom: string
    toRoom: string
    transferDate: string
    reason: string
    staffName: string
    roomType: string
    guestEmail?: string
    transferId: string
    bookingId: string
  }): Promise<void> {
    try {
      const notifications: TransferNotification[] = []

      // Guest notification
      if (transferData.guestEmail) {
        notifications.push({
          type: 'guest_notification',
          recipient: transferData.guestEmail,
          subject: this.NOTIFICATION_TEMPLATES.guest.subject,
          message: this.formatMessage(this.NOTIFICATION_TEMPLATES.guest.message, transferData),
          status: 'pending',
          transfer_id: transferData.transferId,
          booking_id: transferData.bookingId
        })
      }

      // Housekeeping notification
      notifications.push({
        type: 'housekeeping_notification',
        recipient: 'housekeeping@hotel.com', // This should be configurable
        subject: this.NOTIFICATION_TEMPLATES.housekeeping.subject,
        message: this.formatMessage(this.NOTIFICATION_TEMPLATES.housekeeping.message, transferData),
        status: 'pending',
        transfer_id: transferData.transferId,
        booking_id: transferData.bookingId
      })

      // Management notification
      notifications.push({
        type: 'management_notification',
        recipient: 'management@hotel.com', // This should be configurable
        subject: this.NOTIFICATION_TEMPLATES.management.subject,
        message: this.formatMessage(this.NOTIFICATION_TEMPLATES.management.message, transferData),
        status: 'pending',
        transfer_id: transferData.transferId,
        booking_id: transferData.bookingId
      })

      // Store notifications in database
      for (const notification of notifications) {
        await this.storeNotification(notification)
      }

      // Process notifications asynchronously
      this.processNotifications(notifications)

    } catch (error) {
      console.error('Error sending transfer notifications:', error)
    }
  }

  /**
   * Store notification in database
   */
  private static async storeNotification(notification: TransferNotification): Promise<void> {
    try {
      const { error } = await supabase
        .from('transfer_notifications')
        .insert({
          type: notification.type,
          recipient: notification.recipient,
          subject: notification.subject,
          message: notification.message,
          status: notification.status,
          transfer_id: notification.transfer_id,
          booking_id: notification.booking_id,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing notification:', error)
    }
  }

  /**
   * Process notifications (send emails, etc.)
   */
  private static async processNotifications(notifications: TransferNotification[]): Promise<void> {
    for (const notification of notifications) {
      try {
        if (notification.type === 'guest_notification') {
          // Send email to guest
          await emailService.sendEmail({
            to: notification.recipient,
            subject: notification.subject,
            html: notification.message.replace(/\n/g, '<br>'),
            text: notification.message
          })
        } else {
          // Send internal notifications (could be email, SMS, or in-app notifications)
          await this.sendInternalNotification(notification)
        }

        // Update notification status
        await this.updateNotificationStatus(notification.id!, 'sent')

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)
        await this.updateNotificationStatus(notification.id!, 'failed')
      }
    }
  }

  /**
   * Send internal notification
   */
  private static async sendInternalNotification(notification: TransferNotification): Promise<void> {
    // This could be implemented to send to internal systems
    // For now, we'll just log it
    console.log('Internal notification:', {
      type: notification.type,
      recipient: notification.recipient,
      subject: notification.subject
    })
  }

  /**
   * Update notification status
   */
  private static async updateNotificationStatus(notificationId: string, status: 'sent' | 'failed'): Promise<void> {
    try {
      const { error } = await supabase
        .from('transfer_notifications')
        .update({
          status,
          sent_at: status === 'sent' ? new Date().toISOString() : null
        })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating notification status:', error)
    }
  }

  /**
   * Format message with data
   */
  private static formatMessage(template: string, data: any): string {
    return template
      .replace(/{guestName}/g, data.guestName || 'Guest')
      .replace(/{bookingNumber}/g, data.bookingNumber || 'N/A')
      .replace(/{fromRoom}/g, data.fromRoom || 'N/A')
      .replace(/{toRoom}/g, data.toRoom || 'N/A')
      .replace(/{transferDate}/g, data.transferDate || 'N/A')
      .replace(/{reason}/g, data.reason || 'Not specified')
      .replace(/{staffName}/g, data.staffName || 'Staff')
      .replace(/{roomType}/g, data.roomType || 'N/A')
  }

  /**
   * Get notification history
   */
  static async getNotificationHistory(transferId?: string, bookingId?: string): Promise<TransferNotification[]> {
    try {
      let query = supabase
        .from('transfer_notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (transferId) {
        query = query.eq('transfer_id', transferId)
      }
      if (bookingId) {
        query = query.eq('booking_id', bookingId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting notification history:', error)
      throw error
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStatistics(startDate?: Date, endDate?: Date) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate || new Date()

      const { data, error } = await supabase
        .from('transfer_notifications')
        .select('type, status, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      if (error) throw error

      const notifications = data || []
      const stats = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'sent').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        pending: notifications.filter(n => n.status === 'pending').length,
        byType: notifications.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      return stats
    } catch (error) {
      console.error('Error getting notification statistics:', error)
      throw error
    }
  }
}

export default TransferNotificationService
