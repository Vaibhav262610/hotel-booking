// Email service for sending staff invitations
// Integrated with Nodemailer for Gmail delivery
import nodemailer from 'nodemailer'

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'developeralnoor@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
  },
})

export interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

export interface StaffInvitationData {
  name: string
  email: string
  password: string
  role: string
  department: string
  loginUrl: string
}

export class EmailService {
  private static instance: EmailService

  private constructor() {}

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // Check if Gmail credentials are configured
      if (!process.env.GMAIL_APP_PASSWORD) {
        console.log('📧 Gmail App Password not configured - logging to console instead')
        console.log('📧 Sending email:', {
          to: emailData.to,
          subject: emailData.subject,
          from: 'developeralnoor@gmail.com',
          // Don't log the actual content for security
        })
        
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        return true
      }

      // Send email using Gmail
      const mailOptions = {
        from: 'Hotel Management <developeralnoor@gmail.com>',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }

      const info = await transporter.sendMail(mailOptions)
      console.log('📧 Email sent successfully:', info.messageId)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  async sendStaffInvitation(data: StaffInvitationData): Promise<boolean> {
    const subject = `Welcome to Hotel Management System - Your Login Credentials`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Hotel Management System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .credentials { background: #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏨 Hotel Management System</h1>
            <p>Welcome to the team!</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.name},</h2>
            
            <p>Welcome to the Hotel Management System! Your account has been created successfully.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Password:</strong> ${data.password}</p>
              <p><strong>Role:</strong> ${data.role}</p>
              <p><strong>Department:</strong> ${data.department}</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
            </div>
            
            <p>You can now access the system using the button below:</p>
            
            <p style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Login to System</a>
            </p>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
            
            <p>Best regards,<br>
            Hotel Management Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 Hotel Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Welcome to Hotel Management System - Your Login Credentials

Hello ${data.name},

Welcome to the Hotel Management System! Your account has been created successfully.

Your Login Credentials:
- Email: ${data.email}
- Password: ${data.password}
- Role: ${data.role}
- Department: ${data.department}

⚠️ Important: Please change your password after your first login for security purposes.

You can now access the system at: ${data.loginUrl}

If you have any questions or need assistance, please contact your system administrator.

Best regards,
Hotel Management Team

---
This is an automated message. Please do not reply to this email.
© 2024 Hotel Management System. All rights reserved.
    `

    return this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    })
  }

  async sendPasswordReset(data: { email: string; resetUrl: string; name: string }): Promise<boolean> {
    const subject = `Password Reset Request - Hotel Management System`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${data.name},</h2>
            
            <p>We received a request to reset your password for the Hotel Management System.</p>
            
            <p style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${data.resetUrl}</p>
            
            <p>Best regards,<br>
            Hotel Management Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 Hotel Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: data.email,
      subject,
      html,
    })
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance() 