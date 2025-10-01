# Enhanced Booking Management System

## 🎯 Overview

The Enhanced Booking Management System provides comprehensive hotel booking functionality with advanced features including early checkout handling, automatic price adjustments, and robust edge case management.

## ✨ Key Features

### 🔄 Enhanced Checkout System
- **Early Checkout Detection**: Automatically detects when guests check out before their scheduled date
- **Late Checkout Handling**: Manages guests who stay beyond their scheduled checkout
- **Automatic Price Calculations**: Calculates refunds for early checkouts and additional charges for late checkouts
- **Reason Tracking**: Captures reasons for early/late checkouts for business intelligence

### 💰 Price Adjustment Features
- **Daily Rate Calculation**: Automatically calculates daily rates based on total booking amount
- **Refund Processing**: Handles refunds for unused days during early checkouts
- **Additional Charges**: Applies charges for extended stays
- **Payment Summary**: Shows detailed breakdown of original amount, adjustments, and final amount

### 🛡️ Edge Case Management
- **Date Validation**: Prevents bookings with invalid dates (past dates, overlapping stays)
- **Duration Limits**: Enforces minimum (1 day) and maximum (30 days) stay durations
- **Phone/Email Validation**: Validates contact information formats
- **Room Availability**: Ensures rooms are available before booking
- **Payment Validation**: Prevents advance payments exceeding total amounts

### 📊 Enhanced UI/UX
- **Real-time Price Calculation**: Shows price updates as dates change
- **Visual Status Indicators**: Color-coded alerts for early/late/on-time checkouts
- **Comprehensive Forms**: Detailed booking forms with validation feedback
- **Calendar Integration**: Visual calendar view for booking management
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🏗️ System Architecture

### Database Schema Enhancements

The booking system now tracks additional fields:

```sql
-- Enhanced booking fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS:
- actual_check_out TIMESTAMP
- price_adjustment DECIMAL(10,2) DEFAULT 0
- final_amount DECIMAL(10,2)
- checkout_notes TEXT
```

### Service Layer

#### Enhanced Checkout Service (`bookingService.checkOut`)

```typescript
interface CheckoutResult {
  success: boolean
  booking: Booking
  priceAdjustment: number
  finalAmount: number
  adjustmentReason: string
  isEarlyCheckout: boolean
  isLateCheckout: boolean
  daysDifference: number
}
```

**Key Features:**
- Calculates day differences between scheduled and actual checkout
- Determines if checkout is early, late, or on-time
- Computes price adjustments based on daily rates
- Updates booking with final amounts and notes
- Creates housekeeping tasks automatically
- Logs staff actions for audit trail

#### Price Calculation Logic

```typescript
// Early Checkout Refund
if (daysDifference > 0) {
  const dailyRate = totalAmount / scheduledDays
  priceAdjustment = -(dailyRate * daysDifference)
  reason = `Early checkout: ${daysDifference} day(s) refund`
}

// Late Checkout Charges
if (daysDifference < 0) {
  const dailyRate = totalAmount / scheduledDays
  priceAdjustment = Math.abs(dailyRate * Math.abs(daysDifference))
  reason = `Late checkout: ${Math.abs(daysDifference)} day(s) additional charge`
}
```

## 🎨 UI Components

### Enhanced Checkout Dialog

**Location**: `components/enhanced-checkout-dialog.tsx`

**Features:**
- **Booking Information Display**: Shows guest, room, and booking details
- **Date Selection**: Calendar picker for actual checkout date
- **Status Alerts**: Visual indicators for early/late/on-time checkouts
- **Reason Selection**: Dropdown for common early checkout reasons
- **Price Calculation**: Real-time display of adjustments and final amounts
- **Payment Summary**: Shows advance paid and remaining amounts

**Early Checkout Reasons:**
1. Guest request
2. Emergency departure
3. Travel plans changed
4. Business meeting ended early
5. Family emergency
6. Weather conditions
7. Transportation issues
8. Health reasons
9. Other (custom)

### Enhanced Booking Table

**Features:**
- **Price Adjustment Display**: Shows adjustments with color coding
- **Payment Status**: Displays advance paid and remaining amounts
- **Enhanced Actions**: Improved checkout button with better tooltips
- **Status Badges**: Color-coded status indicators

## 🔧 Configuration

### Environment Variables

```env
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration (for notifications)
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

### Validation Rules

```typescript
// Phone Validation
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/

// Email Validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Date Validation
- Check-in date cannot be in the past
- Check-out date must be after check-in date
- Minimum stay: 1 day
- Maximum stay: 30 days

// Payment Validation
- Advance amount cannot exceed total amount
- Advance amount cannot be negative
```

## 📋 Usage Examples

### Early Checkout Scenario

1. **Guest checks out 2 days early**
   - Original booking: 5 nights, ₹10,000
   - Daily rate: ₹2,000
   - Refund: ₹4,000 (2 days × ₹2,000)
   - Final amount: ₹6,000

2. **System automatically:**
   - Updates booking status to "checked-out"
   - Calculates and applies refund
   - Creates housekeeping task
   - Logs the action
   - Shows success message with adjustment details

### Late Checkout Scenario

1. **Guest stays 1 day extra**
   - Original booking: 3 nights, ₹6,000
   - Daily rate: ₹2,000
   - Additional charge: ₹2,000
   - Final amount: ₹8,000

2. **System automatically:**
   - Updates booking with additional charges
   - Creates extended stay record
   - Generates invoice for additional amount

## 🚀 Getting Started

### 1. Database Setup

Run the enhanced database schema:

```sql
-- Add new columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS actual_check_out TIMESTAMP,
ADD COLUMN IF NOT EXISTS price_adjustment DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS checkout_notes TEXT;
```

### 2. Component Integration

Import and use the enhanced checkout dialog:

```typescript
import { EnhancedCheckoutDialog } from "@/components/enhanced-checkout-dialog"

// In your component
<EnhancedCheckoutDialog
  booking={selectedBooking}
  isOpen={isDialogOpen}
  onClose={() => setIsDialogOpen(false)}
  onCheckout={handleCheckout}
/>
```

### 3. Service Usage

Use the enhanced checkout service:

```typescript
import { bookingService } from "@/lib/supabase"

const result = await bookingService.checkOut(
  bookingId,
  actualCheckOutDate,
  earlyCheckoutReason
)

console.log(result)
// {
//   success: true,
//   priceAdjustment: -2000,
//   finalAmount: 8000,
//   adjustmentReason: "Early checkout: 1 day(s) refund",
//   isEarlyCheckout: true,
//   daysDifference: 1
// }
```

## 🔍 Testing Scenarios

### Test Case 1: Standard Checkout
- **Input**: Guest checks out on scheduled date
- **Expected**: No price adjustment, status updated to "checked-out"

### Test Case 2: Early Checkout
- **Input**: Guest checks out 2 days early from 5-night booking
- **Expected**: 40% refund applied, housekeeping task created

### Test Case 3: Late Checkout
- **Input**: Guest stays 1 day extra
- **Expected**: Additional charge applied, extended stay recorded

### Test Case 4: Invalid Dates
- **Input**: Check-in date in the past
- **Expected**: Validation error, booking prevented

### Test Case 5: Payment Validation
- **Input**: Advance amount exceeds total amount
- **Expected**: Validation error, form submission blocked

## 🛠️ Troubleshooting

### Common Issues

1. **Checkout Error**: "Booking not found"
   - **Solution**: Ensure booking ID is valid and booking exists

2. **Price Calculation Error**: "Invalid daily rate"
   - **Solution**: Check that total amount and scheduled days are valid

3. **Date Validation Error**: "Check-in date cannot be in the past"
   - **Solution**: Use current or future dates for bookings

4. **Room Status Error**: "Room not available"
   - **Solution**: Check room availability before booking

### Debug Mode

Enable debug logging:

```typescript
// In development
console.log('Checkout calculation:', {
  scheduledDays,
  actualDays,
  daysDifference,
  priceAdjustment,
  finalAmount
})
```

## 🔮 Future Enhancements

### Planned Features

1. **Automated Notifications**
   - Email/SMS alerts for early checkouts
   - Payment reminders for remaining amounts

2. **Advanced Analytics**
   - Early checkout patterns analysis
   - Revenue impact reporting
   - Guest behavior insights

3. **Integration Features**
   - Payment gateway integration
   - Accounting system sync
   - CRM integration

4. **Mobile App**
   - Native mobile application
   - Push notifications
   - Offline capability

### Performance Optimizations

1. **Caching Strategy**
   - Redis caching for frequently accessed data
   - Query optimization for large datasets

2. **Real-time Updates**
   - WebSocket integration for live updates
   - Real-time booking status changes

## 📞 Support

For technical support or feature requests:

1. **Documentation**: Check this README and inline code comments
2. **Issues**: Create detailed bug reports with reproduction steps
3. **Enhancements**: Submit feature requests with use case descriptions

---

**Version**: 2.0.0  
**Last Updated**: December 2024  
**Compatibility**: Next.js 15+, React 18+, TypeScript 5+ 