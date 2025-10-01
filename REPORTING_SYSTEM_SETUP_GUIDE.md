# Hotel Management System - Enhanced Reporting System Setup Guide

## 🎯 Overview

This guide covers the implementation of the new enhanced reporting system with the following features:

- **Walk-in Reports**: Separate reports for all walk-in bookings
- **Online Booking Reports**: Separate reports for online bookings and reservations
- **Role-Based Access Control**: Front office staff can only access day settlement reports
- **WhatsApp Integration**: Automatic day settlement reports sent at midnight daily
- **Enhanced Analytics**: Comprehensive booking source analysis and staff performance tracking

## 🚀 New Features Implemented

### 1. Enhanced Reports
- **Walk-in Report**: Detailed analysis of direct walk-in guests
- **Online Booking Report**: Website and reservation system bookings
- **Day Settlement Report**: Comprehensive daily financial summary
- **Advance Collection Report**: Advance payment tracking
- **Occupancy Analysis Report**: Room utilization and revenue metrics

### 2. Role-Based Access Control
- **Admin Users**: Access to all reports and analytics
- **Front Office Staff**: Limited to day settlement reports only
- **Housekeeping Staff**: No access to financial reports

### 3. WhatsApp Integration
- **Automatic Reports**: Daily settlement reports sent at midnight
- **Manual Sending**: On-demand report delivery
- **Rich Formatting**: Professional message formatting with emojis and structure
- **Document Support**: CSV reports can be sent as attachments

## 📱 WhatsApp Integration Setup

### Prerequisites
1. **WhatsApp Business API Account**
   - Facebook Developer Account
   - WhatsApp Business API access
   - Phone number verification

2. **Environment Variables**
   ```bash
   # Add to your .env.local file
   WHATSAPP_API_KEY=your_whatsapp_api_key_here
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
   ```

### API Configuration
The system uses the Facebook Graph API v18.0 for WhatsApp Business:

```typescript
// Example configuration in lib/whatsapp-service.ts
const baseUrl = 'https://graph.facebook.com/v18.0'
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
const apiKey = process.env.WHATSAPP_API_KEY
```

### Message Format
Day settlement reports are automatically formatted with:
- 📊 Summary statistics
- 💳 Payment method breakdown
- 👥 Staff performance metrics
- 🏨 Professional branding

## ⏰ Automated Report Scheduling

### Cron Job Setup
To automatically send reports at midnight daily, set up a cron job:

```bash
# Add to your crontab (crontab -e)
0 0 * * * curl -X POST "https://your-domain.com/api/reports/day-settlement" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

### Alternative: Serverless Cron
For Vercel or similar platforms, use their cron job features:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/reports/day-settlement",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## 🔐 Role-Based Access Implementation

### User Role Detection
```typescript
// Mock function - replace with your authentication system
const getUserRole = () => {
  // In production, get this from your auth context
  return "admin" // "admin" | "front_office" | "housekeeping"
}
```

### Access Control Logic
```typescript
const canAccessReport = (reportType: string) => {
  if (userRole === "admin") return true
  
  // Front office staff can only see day settlement report
  if (userRole === "front_office") {
    return reportType === "day-settlement"
  }
  
  return false
}
```

## 📊 Report Data Structure

### Walk-in Report Data
```typescript
interface WalkinReportData {
  billNo: string
  roomNo: string
  guestName: string
  checkInTime: string
  checkOutTime: string
  totalAmount: number
  advanceAmount: number
  remainingAmount: number
  paymentMethod: string
  staffHandler: string
  duration: string
}
```

### Online Booking Report Data
```typescript
interface OnlineBookingReportData {
  bookingId: string
  roomNo: string
  guestName: string
  bookingDate: string
  checkInDate: string
  checkOutDate: string
  totalAmount: number
  advanceAmount: number
  remainingAmount: number
  paymentMethod: string
  bookingSource: string
  status: string
}
```

## 🛠️ API Endpoints

### Day Settlement Report API
```
POST /api/reports/day-settlement
GET /api/reports/day-settlement?phone=+919876543210&date=2024-01-15
```

**Request Body:**
```json
{
  "phoneNumber": "+919876543210",
  "date": "2024-01-15" // Optional, defaults to yesterday
}
```

**Response:**
```json
{
  "success": true,
  "message": "Day settlement report sent successfully",
  "report": {
    "date": "January 15, 2024",
    "totalBookings": 25,
    "totalRevenue": 125000
  }
}
```

## 🔧 Testing the System

### 1. Manual WhatsApp Test
1. Navigate to Reports page
2. Enter a valid phone number
3. Click "Test API" button
4. Check console for mock WhatsApp service logs

### 2. API Testing
```bash
# Test the API endpoint
curl -X GET "http://localhost:3000/api/reports/day-settlement?phone=+919876543210"
```

### 3. Role-Based Access Test
1. Change `getUserRole()` function to return different roles
2. Verify that front office staff only see day settlement reports
3. Confirm admin users see all reports

## 📈 Analytics and Charts

### Available Charts (Admin Only)
- **Occupancy & Revenue Trend**: Line chart showing daily metrics
- **Booking Source Distribution**: Pie chart of walk-in vs online bookings
- **Room Type Distribution**: Guest accommodation breakdown

### Chart Data Sources
- Real-time data from Supabase database
- Automatic refresh on date range changes
- Exportable data for external analysis

## 🚨 Error Handling

### WhatsApp Service Errors
- API credential validation
- Phone number format validation
- Network error handling
- Rate limiting protection

### Report Generation Errors
- Database connection issues
- Data validation errors
- Export file generation errors

## 🔒 Security Considerations

### Data Protection
- Role-based data access
- Phone number validation
- API rate limiting
- Secure environment variables

### WhatsApp API Security
- API key protection
- Phone number verification
- Message content validation

## 📝 Environment Variables

```bash
# Required for WhatsApp integration
WHATSAPP_API_KEY=your_whatsapp_business_api_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Database (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 Development vs Production

### Development Mode
- Uses `MockWhatsAppService` for testing
- Console logging of WhatsApp messages
- No actual API calls to WhatsApp

### Production Mode
- Uses real `WhatsAppService`
- Actual WhatsApp Business API integration
- Error logging and monitoring

## 🔄 Future Enhancements

### Planned Features
1. **Email Reports**: PDF generation and email delivery
2. **SMS Integration**: Alternative to WhatsApp for critical alerts
3. **Report Scheduling**: Customizable report delivery times
4. **Advanced Analytics**: Machine learning insights
5. **Multi-language Support**: Localized report formats

### Integration Possibilities
- **Slack**: Team communication integration
- **Microsoft Teams**: Enterprise collaboration
- **Telegram**: Alternative messaging platform
- **Email**: Traditional report delivery

## 📞 Support and Troubleshooting

### Common Issues
1. **WhatsApp API Errors**: Check API credentials and phone number format
2. **Report Access Issues**: Verify user role configuration
3. **Data Loading Errors**: Check database connection and permissions
4. **Export Failures**: Verify file permissions and storage space

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

### Testing Checklist
- [ ] User role detection working
- [ ] Report access control functioning
- [ ] WhatsApp integration responding
- [ ] Data export working
- [ ] Charts rendering correctly
- [ ] API endpoints accessible

## 🎉 Conclusion

The enhanced reporting system provides:
- **Comprehensive Analytics**: Detailed insights into hotel operations
- **Role-Based Security**: Appropriate access levels for different staff
- **Automated Reporting**: Daily WhatsApp delivery without manual intervention
- **Professional Presentation**: Well-formatted reports with visual elements
- **Scalable Architecture**: Easy to extend with new report types

For technical support or feature requests, contact the development team.
