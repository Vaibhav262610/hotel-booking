// WhatsApp service for sending day settlement reports
// This service integrates with WhatsApp Business API or similar services

export interface WhatsAppMessage {
  to: string
  message: string
  type: 'text' | 'document' | 'image'
  documentUrl?: string
  caption?: string
}

export interface DaySettlementReport {
  date: string
  totalBookings: number
  totalRevenue: number
  totalAdvance: number
  totalRemaining: number
  walkinBookings: number
  onlineBookings: number
  paymentMethods: Record<string, number>
  staffPerformance: Record<string, number>
}

export class WhatsAppService {
  private apiKey: string
  private phoneNumberId: string
  private baseUrl: string

  constructor() {
    // These would come from environment variables in production
    this.apiKey = process.env.WHATSAPP_API_KEY || ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    this.baseUrl = 'https://graph.facebook.com/v18.0'
  }

  // Send day settlement report to WhatsApp
  async sendDaySettlementReport(phoneNumber: string, report: DaySettlementReport): Promise<boolean> {
    try {
      const message = this.formatDaySettlementMessage(report)
      
      const whatsappMessage: WhatsAppMessage = {
        to: phoneNumber,
        message,
        type: 'text'
      }

      return await this.sendMessage(whatsappMessage)
    } catch (error) {
      console.error('Error sending day settlement report:', error)
      return false
    }
  }

  // Format day settlement report as a readable message
  private formatDaySettlementMessage(report: DaySettlementReport): string {
    const totalRevenue = report.totalRevenue.toLocaleString('en-IN')
    const totalAdvance = report.totalAdvance.toLocaleString('en-IN')
    const totalRemaining = report.totalRemaining.toLocaleString('en-IN')

    let message = `🏨 *DAY SETTLEMENT REPORT* 🏨\n`
    message += `📅 Date: ${report.date}\n`
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    
    message += `📊 *SUMMARY*\n`
    message += `• Total Bookings: ${report.totalBookings}\n`
    message += `• Walk-in Bookings: ${report.walkinBookings}\n`
    message += `• Online Bookings: ${report.onlineBookings}\n`
    message += `• Total Revenue: ₹${totalRevenue}\n`
    message += `• Total Advance: ₹${totalAdvance}\n`
    message += `• Total Remaining: ₹${totalRemaining}\n\n`

    if (Object.keys(report.paymentMethods).length > 0) {
      message += `💳 *PAYMENT METHODS*\n`
      Object.entries(report.paymentMethods).forEach(([method, amount]) => {
        message += `• ${method}: ₹${amount.toLocaleString('en-IN')}\n`
      })
      message += `\n`
    }

    if (Object.keys(report.staffPerformance).length > 0) {
      message += `👥 *STAFF PERFORMANCE*\n`
      Object.entries(report.staffPerformance).forEach(([staff, bookings]) => {
        message += `• ${staff}: ${bookings} bookings\n`
      })
      message += `\n`
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 Report generated automatically at midnight\n`
    message += `🏨 Hotel Management System`

    return message
  }

  // Send message via WhatsApp Business API
  private async sendMessage(whatsappMessage: WhatsAppMessage): Promise<boolean> {
    try {
      if (!this.apiKey || !this.phoneNumberId) {
        console.warn('WhatsApp API credentials not configured')
        return false
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: whatsappMessage.to,
          type: 'text',
          text: {
            body: whatsappMessage.message
          }
        })
      })

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('WhatsApp message sent successfully:', result)
      return true
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
      return false
    }
  }

  // Send document (CSV report) via WhatsApp
  async sendDocument(phoneNumber: string, documentUrl: string, caption: string): Promise<boolean> {
    try {
      if (!this.apiKey || !this.phoneNumberId) {
        console.warn('WhatsApp API credentials not configured')
        return false
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'document',
          document: {
            link: documentUrl,
            caption: caption
          }
        })
      })

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('WhatsApp document sent successfully:', result)
      return true
    } catch (error) {
      console.error('Failed to send WhatsApp document:', error)
      return false
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    
    // Check if it's a valid Indian phone number (10 digits) or international format
    if (cleanNumber.length === 10) {
      return true // Indian number
    } else if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
      return true // Indian number with country code
    } else if (cleanNumber.length >= 10 && cleanNumber.length <= 15) {
      return true // International number
    }
    
    return false
  }

  // Format phone number for WhatsApp API
  formatPhoneNumber(phoneNumber: string): string {
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    
    // If it's a 10-digit Indian number, add country code
    if (cleanNumber.length === 10) {
      return `91${cleanNumber}`
    }
    
    // If it already has country code, return as is
    if (cleanNumber.length >= 12) {
      return cleanNumber
    }
    
    // Return original if can't determine format
    return phoneNumber
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService()

// Mock implementation for development/testing
export class MockWhatsAppService {
  async sendDaySettlementReport(phoneNumber: string, report: DaySettlementReport): Promise<boolean> {
    console.log('📱 MOCK: Sending day settlement report to WhatsApp')
    console.log('Phone:', phoneNumber)
    console.log('Report:', report)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('✅ MOCK: WhatsApp message sent successfully')
    return true
  }

  async sendDocument(phoneNumber: string, documentUrl: string, caption: string): Promise<boolean> {
    console.log('📱 MOCK: Sending document to WhatsApp')
    console.log('Phone:', phoneNumber)
    console.log('Document:', documentUrl)
    console.log('Caption:', caption)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('✅ MOCK: WhatsApp document sent successfully')
    return true
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    return whatsappService.validatePhoneNumber(phoneNumber)
  }

  formatPhoneNumber(phoneNumber: string): string {
    return whatsappService.formatPhoneNumber(phoneNumber)
  }
}

// Use mock service in development
export const activeWhatsAppService = process.env.NODE_ENV === 'production' 
  ? whatsappService 
  : new MockWhatsAppService()
