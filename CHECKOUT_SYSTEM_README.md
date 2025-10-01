# Enhanced Checkout System

## Overview

The Enhanced Checkout System provides comprehensive checkout management functionality for the hotel management system. It includes automated notifications, grace periods, late fee calculations, detailed reporting, and analytics.

## Features

### 🚀 Core Features

1. **Automated Checkout Processing**
   - Real-time checkout processing with validation
   - Multi-room checkout support
   - Payment tracking and reconciliation
   - Tax calculations and adjustments

2. **Smart Notifications System**
   - Approaching checkout alerts (2 hours before)
   - Overdue checkout notifications
   - Grace period reminders
   - Late fee notifications

3. **Grace Period Management**
   - Configurable grace period (default: 1 hour)
   - Automatic grace period tracking
   - No fees within grace period
   - Grace period usage analytics

4. **Late Fee System**
   - Configurable late fees (default: ₹100/hour)
   - Maximum late fee cap (default: ₹500)
   - Automatic late fee calculations
   - Late fee tracking and reporting

5. **Comprehensive Reporting**
   - Checkout performance analytics
   - Late checkout statistics
   - Revenue impact analysis
   - Exportable reports (CSV)

## Architecture

### Database Schema

The system uses several key tables:

- `checkout_notifications` - Stores checkout alerts and notifications
- `grace_period_tracker` - Tracks grace period usage
- `late_checkout_charges` - Records late checkout fees
- `booking_payment_breakdown` - Payment details and tax calculations
- `payment_transactions` - Individual payment records

### Key Components

1. **CheckoutService** (`lib/checkout-service.ts`)
   - Core checkout processing logic
   - Grace period and late fee calculations
   - Notification management
   - Statistics and reporting

2. **Enhanced Checkout Dialog** (`components/checkout/enhanced-checkout-dialog.tsx`)
   - Comprehensive checkout UI
   - Real-time fee calculations
   - Payment method selection
   - Notes and adjustments

3. **Checkout Notifications** (`components/checkout/checkout-notifications.tsx`)
   - Real-time notification display
   - Dismissal functionality
   - Notification categorization

4. **Checkout Statistics** (`components/checkout/checkout-statistics.tsx`)
   - Performance analytics dashboard
   - Trend analysis
   - Revenue impact metrics

5. **Checkout Reports** (`components/checkout/checkout-reports.tsx`)
   - Detailed checkout reports
   - Export functionality
   - Historical analysis

## API Endpoints

### `/api/checkout/process` (POST)
Process a guest checkout with all validations and fee calculations.

**Request Body:**
```typescript
{
  bookingId: string
  actualCheckOutDate: string
  earlyCheckoutReason?: string
  priceAdjustment: number
  finalAmount: number
  adjustmentReason: string
  remainingBalance?: number
  remainingBalancePaymentMethod?: 'upi' | 'card' | 'cash' | 'bank'
  checkoutNotes?: string
}
```

**Response:**
```typescript
{
  success: boolean
  data?: any
  isLateCheckout?: boolean
  lateFee?: number
  gracePeriodUsed?: boolean
  error?: string
}
```

### `/api/checkout/notifications` (GET/POST)
- **GET**: Retrieve active checkout notifications
- **POST**: Process automated notifications (for cron jobs)

## Configuration

### Grace Period Settings
```typescript
const GRACE_PERIOD_CONFIG = {
  enabled: true,
  durationMinutes: 60, // 1 hour grace period
  lateFeePerHour: 100, // ₹100 per hour after grace period
  maxLateFee: 500 // Maximum ₹500 late fee
}
```

### Notification Settings
- Approaching notifications: 2 hours before checkout
- Overdue notifications: Immediately after scheduled checkout
- Grace period notifications: Within grace period
- Late fee notifications: After grace period expires

## Usage Examples

### Basic Checkout Processing
```typescript
import { CheckoutService } from '@/lib/checkout-service'

const result = await CheckoutService.processCheckout({
  bookingId: 'booking-id',
  actualCheckOutDate: new Date(),
  priceAdjustment: 0,
  finalAmount: 5000,
  adjustmentReason: 'No adjustments',
  checkoutNotes: 'Smooth checkout process'
})

if (result.success) {
  console.log('Checkout processed successfully')
  console.log('Late fee:', result.lateFee)
  console.log('Grace period used:', result.gracePeriodUsed)
}
```

### Getting Checkout Statistics
```typescript
const stats = await CheckoutService.getCheckoutStatistics(
  new Date('2024-01-01'),
  new Date('2024-01-31')
)

console.log('Total checkouts:', stats.totalCheckouts)
console.log('On-time rate:', stats.onTimeCheckouts)
console.log('Total late fees:', stats.totalLateFees)
```

### Managing Notifications
```typescript
// Get active notifications
const notifications = await CheckoutService.getActiveCheckoutAlerts()

// Dismiss a notification
await CheckoutService.dismissNotification(notificationId, staffId)
```

## Database Functions

The system includes several PostgreSQL functions:

### `get_active_checkout_alerts()`
Returns all active checkout notifications with booking and room details.

### `process_automated_checkout_notifications()`
Processes automated notifications for approaching and overdue checkouts.

### `calculate_late_checkout_fee(booking_id, actual_checkout, grace_period, late_fee_per_hour, max_late_fee)`
Calculates late checkout fees based on grace period and hourly rates.

### `get_checkout_statistics(start_date, end_date)`
Returns checkout statistics for a given date range.

## Automation

### Cron Job Setup
Set up a cron job to run automated notifications every hour:

```bash
# Run every hour
0 * * * * curl -X POST http://your-domain.com/api/checkout/notifications
```

### Real-time Updates
The system supports real-time updates through Supabase subscriptions for:
- New checkout notifications
- Updated checkout statuses
- Payment confirmations

## Testing

### Unit Tests
Test individual components:
```bash
npm test components/checkout/
```

### Integration Tests
Test the complete checkout flow:
```bash
npm test checkout-integration
```

### Manual Testing Checklist
- [ ] On-time checkout processing
- [ ] Early checkout with reason
- [ ] Late checkout within grace period
- [ ] Late checkout with fees
- [ ] Payment processing
- [ ] Notification generation
- [ ] Statistics calculation
- [ ] Report generation

## Monitoring

### Key Metrics
- Checkout on-time rate
- Average late time
- Late fee revenue
- Grace period usage
- Notification response time

### Alerts
- High late checkout rate (>20%)
- Unusual late fee patterns
- Notification system failures
- Database performance issues

## Troubleshooting

### Common Issues

1. **Notifications not appearing**
   - Check if cron job is running
   - Verify database triggers are active
   - Check notification table permissions

2. **Late fees not calculating**
   - Verify grace period configuration
   - Check timezone settings
   - Validate date/time calculations

3. **Checkout processing fails**
   - Check booking status
   - Verify payment breakdown exists
   - Check database constraints

### Debug Mode
Enable debug logging:
```typescript
const DEBUG_CHECKOUT = process.env.DEBUG_CHECKOUT === 'true'
```

## Future Enhancements

1. **Advanced Analytics**
   - Predictive checkout timing
   - Guest behavior analysis
   - Revenue optimization

2. **Mobile App Integration**
   - Push notifications
   - Mobile checkout processing
   - Guest self-checkout

3. **AI-Powered Features**
   - Automated fee waivers
   - Predictive notifications
   - Smart grace period adjustment

4. **Integration Features**
   - PMS system integration
   - Payment gateway integration
   - Third-party notification services

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.
