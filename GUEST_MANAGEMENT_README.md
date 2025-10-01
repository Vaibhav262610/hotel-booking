# 🏨 Guest Management System

A comprehensive guest management system for the HMS (Hotel Management System) that provides complete guest profile management, preferences tracking, communication history, and loyalty program features.

## ✨ Features Implemented

### 🎯 **Core Guest Management**

- **Enhanced Guest Profiles**: Complete guest information with personal details, contact info, and preferences
- **Guest Categories**: Regular, VIP, Corporate, Travel Agent classifications
- **Guest Search & Filter**: Search by name, email, phone with category filtering
- **Guest Statistics**: Real-time stats for total guests, active guests, repeat guests, and VIP guests

### 📊 **Guest Analytics & History**

- **Visit History**: Complete tracking of all guest stays with dates, room types, and amounts
- **Loyalty Program**: Points system with tier-based rewards (Bronze, Silver, Gold, Platinum)
- **Guest Statistics**: Total stays, total spent, loyalty points, and average ratings
- **Repeat Guest Tracking**: Identify and manage guests with multiple stays

### 💬 **Communication & Preferences**

- **Communication History**: Track all interactions (email, SMS, phone, in-person)
- **Guest Preferences**: Store and manage guest preferences for personalized service
- **Special Requests**: Track and manage guest special requests with status updates
- **Document Management**: Store and verify guest documents (passport, ID, etc.)

### ⭐ **Feedback & Quality**

- **Guest Feedback**: Collect and track guest ratings and feedback
- **Anonymous Feedback**: Support for anonymous guest feedback
- **Quality Metrics**: Track guest satisfaction and service quality

## 🗄️ Database Schema

### Enhanced Tables Added:

1. **`guests`** (Enhanced)
   - Added: title, first_name, last_name, date_of_birth, nationality
   - Added: company, designation, emergency contacts
   - Added: guest_category, loyalty_points, total_stays, total_spent
   - Added: last_stay_date, status, notes

2. **`guest_preferences`** (New)
   - preference_type, preference_value
   - Links to guest_id

3. **`guest_communications`** (New)
   - communication_type, subject, message, status
   - Links to guest_id and staff_id

4. **`guest_documents`** (New)
   - document_type, document_number, document_url
   - verification status and expiry dates

5. **`guest_special_requests`** (New)
   - request_type, request_details, status
   - Links to guest_id and booking_id

6. **`guest_feedback`** (New)
   - rating, category, feedback_text
   - Links to guest_id and booking_id

7. **`guest_loyalty`** (New)
   - tier, points_earned, points_redeemed, points_expired
   - tier_upgrade_date, last_activity_date

8. **`guest_visits`** (New)
   - check_in_date, check_out_date, room_type
   - total_amount, points_earned, special_requests_count

## 🚀 Installation & Setup

### 1. Run Database Migration

```bash
# Navigate to the scripts directory
cd scripts

# Run the guest management migration
./run-guest-management-migration.sh
```

### 2. Verify Installation

After running the migration, you should see:

- ✅ Enhanced guest profiles with additional fields
- ✅ New tables for preferences, communications, documents
- ✅ Loyalty program and visit history tracking
- ✅ Automatic triggers for guest statistics updates

### 3. Access the Guest Management System

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to the Guest Management page:
   ```
   http://localhost:3000/guests
   ```

## 🧪 Testing the System

### 1. **Basic Functionality Test**

- [ ] Navigate to `/guests` page
- [ ] Verify guest statistics cards are displayed
- [ ] Test search functionality with existing guest names
- [ ] Test category filtering (Regular, VIP, Corporate, Travel Agent)

### 2. **Guest Profile Test**

- [ ] View existing guest profiles in the table
- [ ] Check that guest information is properly displayed
- [ ] Verify contact information (email, phone) is shown
- [ ] Confirm guest categories are properly color-coded

### 3. **Search & Filter Test**

- [ ] Search for a guest by name
- [ ] Search for a guest by email
- [ ] Search for a guest by phone number
- [ ] Filter guests by category (VIP, Regular, etc.)
- [ ] Verify filtered results are accurate

### 4. **Statistics Verification**

- [ ] Check total guest count matches database
- [ ] Verify active guests count
- [ ] Confirm repeat guests (2+ stays) count
- [ ] Validate VIP guests count

### 5. **Database Verification**

```sql
-- Check if new tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'guest_%';

-- Verify guest table enhancements
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'guests'
AND column_name IN ('guest_category', 'loyalty_points', 'total_stays', 'total_spent');

-- Check if triggers were created
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name LIKE '%guest%';
```

## 📋 API Endpoints

The guest management system provides the following service functions:

### Guest Management

- `guestService.getGuests()` - Get all guests
- `guestService.getGuestById(id)` - Get specific guest
- `guestService.createGuest(data)` - Create new guest
- `guestService.updateGuest(id, data)` - Update guest
- `guestService.deleteGuest(id)` - Soft delete guest
- `guestService.searchGuests(query)` - Search guests

### Preferences

- `guestService.getGuestPreferences(guestId)` - Get guest preferences
- `guestService.setGuestPreference(guestId, type, value)` - Set preference

### Communications

- `guestService.getGuestCommunications(guestId)` - Get communication history
- `guestService.addCommunication(data)` - Add communication record

### Documents

- `guestService.getGuestDocuments(guestId)` - Get guest documents
- `guestService.addGuestDocument(data)` - Add document
- `guestService.verifyDocument(documentId, verifiedBy)` - Verify document

### Special Requests

- `guestService.getGuestSpecialRequests(guestId)` - Get special requests
- `guestService.addSpecialRequest(data)` - Add request
- `guestService.updateSpecialRequestStatus(requestId, status)` - Update status

### Feedback & Loyalty

- `guestService.getGuestFeedback(guestId)` - Get feedback
- `guestService.addFeedback(data)` - Add feedback
- `guestService.getGuestLoyalty(guestId)` - Get loyalty info
- `guestService.addLoyaltyPoints(guestId, points)` - Add points

### Analytics

- `guestService.getGuestStats(guestId)` - Get comprehensive stats
- `guestService.getGuestVisits(guestId)` - Get visit history
- `guestService.getRepeatGuests()` - Get repeat guests
- `guestService.getVIPGuests()` - Get VIP guests

## 🎯 Key Features in Action

### 1. **Guest Profile Management**

- Complete guest information storage
- Personal details, contact info, emergency contacts
- Company and designation for corporate guests
- Guest category classification

### 2. **Loyalty Program**

- Automatic points calculation (1 point per ₹100 spent)
- Tier-based system (Bronze, Silver, Gold, Platinum)
- Points tracking and tier upgrades
- Activity tracking and statistics

### 3. **Communication Tracking**

- All guest communications logged
- Email, SMS, phone, and in-person interactions
- Communication status tracking
- Staff assignment and scheduling

### 4. **Preference Management**

- Store guest preferences for personalized service
- Room preferences, dietary restrictions, special requests
- Automatic preference application during bookings

### 5. **Document Management**

- Store guest documents (passport, ID, etc.)
- Document verification system
- Expiry date tracking
- Secure document storage

## 🔧 Troubleshooting

### Common Issues:

1. **Migration Fails**
   - Check database connection
   - Verify environment variables
   - Ensure Supabase is accessible

2. **Guest Data Not Loading**
   - Check if guest service is properly imported
   - Verify database permissions
   - Check browser console for errors

3. **Search Not Working**
   - Verify search query format
   - Check if guest data exists
   - Test with known guest names

4. **Statistics Not Updating**
   - Check if triggers are properly created
   - Verify guest data integrity
   - Refresh the page to reload data

### Debug Commands:

```sql
-- Check guest data
SELECT * FROM guests LIMIT 5;

-- Verify new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'guests'
AND column_name IN ('guest_category', 'loyalty_points');

-- Check triggers
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name LIKE '%guest%';
```

## 🚀 Next Steps

After implementing the Guest Management System, consider adding:

1. **Advanced Features**
   - Guest photo upload
   - Digital signature capture
   - Guest portal for self-service
   - Mobile app integration

2. **Enhanced Analytics**
   - Guest behavior analysis
   - Predictive analytics
   - Revenue forecasting
   - Guest lifetime value calculation

3. **Integration Features**
   - Email marketing integration
   - SMS notification system
   - Social media integration
   - Third-party booking system sync

## 📞 Support

If you encounter any issues with the Guest Management System:

1. Check the troubleshooting section above
2. Verify database migration was successful
3. Check browser console for JavaScript errors
4. Ensure all environment variables are properly set

---

**🎉 Congratulations!** You now have a comprehensive Guest Management System that provides complete guest profile management, preferences tracking, communication history, and loyalty program features.
