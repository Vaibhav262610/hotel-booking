# Gmail Email Setup Guide

## 🎉 **Perfect Solution for Your Needs!**

Nodemailer with Gmail is the ideal free solution that will send emails from `developeralnoor@gmail.com` to any staff member's email address.

## 🔧 **Step 1: Enable 2-Factor Authentication**

1. **Go to your Google Account**: [myaccount.google.com](https://myaccount.google.com)
2. **Navigate to Security**
3. **Enable 2-Step Verification** (required for App Passwords)

## 🔑 **Step 2: Generate App Password**

1. **Go to Google Account Security**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. **Select "Mail"** from the dropdown
3. **Select "Other (Custom name)"**
4. **Enter name**: "Hotel Management System"
5. **Click "Generate"**
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

## ⚙️ **Step 3: Add to Environment Variables**

Add this to your `.env.local` file:

```env
GMAIL_USER=developeralnoor@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password_here
```

**Important**:

- Remove spaces from the app password
- Use the exact 16 characters without spaces
- Example: `abcd efgh ijkl mnop` becomes `abcdefghijklmnop`

## 🧪 **Step 4: Test the Email System**

1. **Restart your development server**:

   ```bash
   npm run dev
   ```

2. **Go to staff management page**: `http://localhost:3000/staff`

3. **Create a new staff member** with any email address

4. **Check the recipient's inbox** for the invitation email

## 📧 **What You'll Get:**

### **Email Features:**

- ✅ **From**: Hotel Management <developeralnoor@gmail.com>
- ✅ **To**: Any staff member's email address
- ✅ **Professional HTML template**
- ✅ **Generated password**
- ✅ **Role and department info**
- ✅ **Direct login link**
- ✅ **Security warnings**

### **Email Content:**

```
Subject: Welcome to Hotel Management System - Your Login Credentials

Hello [Staff Name],

Welcome to the Hotel Management System! Your account has been created successfully.

Your Login Credentials:
- Email: [staff@example.com]
- Password: [generated_password]
- Role: [Front Office Staff]
- Department: [Front Office]

⚠️ Important: Please change your password after your first login.

Login to System: [http://localhost:3000/login]

Best regards,
Hotel Management Team
```

## 🔍 **Troubleshooting:**

### **App Password Issues:**

- ✅ Make sure 2-Factor Authentication is enabled
- ✅ Use the exact 16-character password (no spaces)
- ✅ Verify the email address is correct

### **Email Not Sending:**

- ✅ Check browser console for errors
- ✅ Verify environment variables are set
- ✅ Restart development server after adding credentials

### **Email in Spam:**

- ✅ Check spam/junk folder
- ✅ Gmail from Gmail usually doesn't go to spam
- ✅ Professional email templates help deliverability

## 🎯 **Advantages of This Setup:**

### **✅ Free Forever:**

- No monthly limits
- No API costs
- No domain verification needed

### **✅ Easy Setup:**

- Uses your existing Gmail account
- No third-party services needed
- Simple configuration

### **✅ Reliable:**

- Gmail's excellent deliverability
- Professional sender address
- No rate limiting issues

### **✅ Flexible:**

- Send to any email address
- Custom HTML templates
- Full control over content

## 🚀 **Production Ready:**

This setup is perfect for:

- ✅ Development and testing
- ✅ Small to medium hotels
- ✅ Production deployment
- ✅ Any number of staff members

## 📋 **Quick Test:**

1. **Add your Gmail App Password** to `.env.local`
2. **Restart the server**
3. **Create a staff member** with any email
4. **Check the recipient's inbox**

**You should receive a professional invitation email within seconds!** 🎉

---

**This is the perfect free solution for your hotel management system!** 🏨✨
