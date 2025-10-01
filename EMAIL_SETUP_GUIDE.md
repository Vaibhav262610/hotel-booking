# Email Setup Guide

## 📧 **Current Status**

The email system is now set up with **Resend** integration, but you have multiple options for email delivery.

## 🚀 **Option 1: Use Resend (Recommended - Free)**

### Step 1: Sign up for Resend

1. Go to [resend.com](https://resend.com)
2. Create a free account
3. Get your API key from the dashboard

### Step 2: Add API Key to Environment

Add this to your `.env.local` file:

```env
RESEND_API_KEY=re_your_api_key_here
```

### Step 3: Verify Domain (Optional)

- Add your domain to Resend for better deliverability
- Or use the default Resend domain for testing

## 🔧 **Option 2: Use SendGrid**

### Step 1: Install SendGrid

```bash
npm install @sendgrid/mail
```

### Step 2: Update Email Service

Replace the Resend import in `lib/email-service.ts`:

```typescript
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
```

### Step 3: Add API Key

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

## 🔧 **Option 3: Use AWS SES**

### Step 1: Install AWS SDK

```bash
npm install @aws-sdk/client-ses
```

### Step 2: Update Email Service

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
const ses = new SESClient({ region: "us-east-1" });
```

### Step 3: Add AWS Credentials

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

## 🔧 **Option 4: Use Nodemailer (SMTP)**

### Step 1: Install Nodemailer

```bash
npm install nodemailer
```

### Step 2: Update Email Service

```typescript
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransporter({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

### Step 3: Add SMTP Credentials

```env
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🧪 **Testing Email Functionality**

### Current Behavior (No API Key)

- ✅ Console logging shows email details
- ✅ Professional email templates
- ✅ Password generation
- ❌ No actual email delivery

### With API Key Configured

- ✅ Real email delivery
- ✅ Professional HTML emails
- ✅ Password included in email
- ✅ Login link included

## 📋 **Email Template Features**

### Staff Invitation Email Includes:

- 🏨 Professional hotel branding
- 👤 Staff member details
- 🔐 Generated password
- 🎯 Role and department info
- ⚠️ Security warnings
- 🔗 Direct login link
- 📱 Mobile-responsive design

### Password Reset Email Includes:

- 🔐 Secure reset link
- ⏰ Time-limited validity
- ⚠️ Security notices
- 📱 Mobile-responsive design

## 🔍 **Testing Steps**

1. **Without API Key (Current):**

   ```bash
   # Create a new staff member
   # Check browser console (F12) for email logs
   # You'll see: "📧 Email service not configured - logging to console instead"
   ```

2. **With API Key:**
   ```bash
   # Add your API key to .env.local
   # Restart the development server
   # Create a new staff member
   # Check your email inbox
   ```

## 🛠️ **Troubleshooting**

### Email Not Sending

- ✅ Check API key is correct
- ✅ Verify email service is configured
- ✅ Check browser console for errors
- ✅ Verify network connectivity

### Email in Spam

- ✅ Add SPF/DKIM records
- ✅ Use verified domain
- ✅ Check email content
- ✅ Monitor delivery rates

### API Errors

- ✅ Check API key permissions
- ✅ Verify account status
- ✅ Check rate limits
- ✅ Review error logs

## 📊 **Email Service Comparison**

| Service        | Free Tier    | Setup Difficulty | Deliverability |
| -------------- | ------------ | ---------------- | -------------- |
| **Resend**     | 3,000/month  | Easy             | Excellent      |
| **SendGrid**   | 100/day      | Medium           | Excellent      |
| **AWS SES**    | 62,000/month | Hard             | Excellent      |
| **Nodemailer** | Free         | Medium           | Good           |

## 🎯 **Recommendation**

For your hotel management system, I recommend **Resend** because:

- ✅ Free tier (3,000 emails/month)
- ✅ Easy setup
- ✅ Excellent deliverability
- ✅ Professional templates
- ✅ Good documentation

## 🚀 **Quick Start with Resend**

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_your_key_here
   ```
4. Restart your development server
5. Test by creating a new staff member

Your emails will now be delivered to real inboxes! 🎉
