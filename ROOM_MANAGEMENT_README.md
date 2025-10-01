# 🏨 Enhanced Room Management System

A comprehensive room management system for hotels with full CRUD operations, validations, and hotel-specific features.

## ✨ Features

### 🔧 Core CRUD Operations
- **Create**: Add new rooms with comprehensive details
- **Read**: View room details, booking history, and status
- **Update**: Modify room information with validation
- **Delete**: Remove rooms with safety checks

### 🛡️ Smart Validations
- **Occupied Room Protection**: Cannot edit/delete rooms that are currently occupied
- **Room Number Uniqueness**: Prevents duplicate room numbers
- **Booking History Check**: Cannot delete rooms with booking history
- **Status Validation**: Ensures valid room status transitions

### 🏨 Hotel-Specific Features
- **Room Transfer**: Move guests between rooms seamlessly
- **Status Management**: Update room status (Available, Occupied, Maintenance, etc.)
- **Amenities Management**: Comprehensive amenities selection
- **Booking History**: View all bookings for each room
- **Occupancy Tracking**: Real-time occupancy rate calculation

### 📊 Advanced Filtering & Search
- **Multi-criteria Search**: Search by room number, type, or amenities
- **Status Filtering**: Filter by room status
- **Floor Filtering**: Filter by floor number
- **Type Filtering**: Filter by room type
- **Real-time Stats**: Live statistics dashboard

## 🗄️ Database Schema

### Room Table Structure
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  number VARCHAR(10) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'available',
  amenities TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Room Status Types
- `available` - Ready for booking
- `occupied` - Currently occupied by guests
- `unclean` - Needs cleaning after checkout
- `maintenance` - Under maintenance/repair
- `cleaning` - Currently being cleaned
- `blocked` - Temporarily blocked/unavailable

## 🚀 API Endpoints

### Room Service Functions

#### Get All Rooms
```typescript
const rooms = await roomService.getRooms()
```

#### Create Room
```typescript
const newRoom = await roomService.createRoom({
  number: "101",
  type: "single",
  floor: 1,
  capacity: 2,
  price: 2500,
  amenities: "AC, WiFi, TV"
})
```

#### Update Room
```typescript
const updatedRoom = await roomService.updateRoom(roomId, {
  price: 3000,
  amenities: "AC, WiFi, TV, Mini Bar"
})
```

#### Delete Room
```typescript
await roomService.deleteRoom(roomId)
```

#### Transfer Room
```typescript
await roomService.transferRoom(fromRoomId, toRoomId, bookingId)
```

#### Update Room Status
```typescript
const updatedRoom = await roomService.updateRoomStatus(roomId, "maintenance")
```

#### Get Room Bookings
```typescript
const bookings = await roomService.getRoomBookings(roomId)
```

## 🛡️ Validation Rules

### Create Room Validations
- ✅ Room number must be unique
- ✅ Room type must be valid
- ✅ Floor must be positive integer
- ✅ Capacity must be positive integer
- ✅ Price must be positive number
- ✅ Amenities are optional

### Update Room Validations
- ❌ Cannot update occupied rooms
- ✅ Room number uniqueness (if changed)
- ✅ All other create validations apply

### Delete Room Validations
- ❌ Cannot delete occupied rooms
- ❌ Cannot delete rooms with booking history
- ✅ Can delete available/unclean/maintenance rooms

### Transfer Room Validations
- ✅ Source room must be occupied
- ✅ Target room must be available
- ✅ Booking must exist and be valid
- ✅ Updates both room statuses automatically

## 🎯 Usage Examples

### Creating a New Room
1. Click "Add New Room" button
2. Fill in required fields:
   - Room Number: "101"
   - Type: "Single Room"
   - Floor: 1
   - Capacity: 2
   - Price: ₹2,500
3. Select amenities from checklist
4. Click "Add Room"

### Editing a Room
1. Click the edit icon (✏️) on any room
2. Modify the desired fields
3. Update amenities if needed
4. Click "Save Changes"

**Note**: Edit is disabled for occupied rooms

### Transferring a Guest
1. Click the transfer icon (→) on an occupied room
2. Select the target room from available rooms
3. Add reason for transfer (optional)
4. Click "Transfer Guest"

### Updating Room Status
1. Click the view icon (👁️) on any room
2. Go to "Status Management" tab
3. Click the desired status button
4. Status updates immediately

## 🔧 Configuration

### Room Types
```typescript
const roomTypes = [
  { value: "single", label: "Single Room" },
  { value: "double", label: "Double Room" },
  { value: "twin", label: "Twin Room" },
  { value: "triple", label: "Triple Room" },
  { value: "suite", label: "Suite" },
  { value: "deluxe", label: "Deluxe Room" },
  { value: "presidential", label: "Presidential Suite" },
]
```

### Common Amenities
```typescript
const commonAmenities = [
  "AC", "WiFi", "TV", "Mini Bar", "Balcony", "Ocean View", "Mountain View", 
  "Room Service", "Coffee Maker", "Safe", "Iron", "Hair Dryer", "Bathtub",
  "Shower", "King Bed", "Queen Bed", "Twin Beds", "Sofa Bed", "Kitchen"
]
```

## 📊 Statistics Dashboard

The system provides real-time statistics:
- **Total Rooms**: Count of all rooms
- **Available**: Rooms ready for booking
- **Occupied**: Currently occupied rooms
- **Maintenance**: Rooms under maintenance/blocked
- **Cleaning**: Rooms being cleaned or unclean
- **Occupancy Rate**: Percentage of occupied rooms

## 🔄 Room Status Flow

```
Available → Occupied (Check-in)
Occupied → Unclean (Check-out)
Unclean → Cleaning (Staff starts cleaning)
Cleaning → Available (Cleaning completed)
Available → Maintenance (Maintenance needed)
Maintenance → Available (Maintenance completed)
```

## 🚨 Error Handling

### Common Error Messages
- `"Room number 101 already exists"` - Duplicate room number
- `"Cannot update room while it is occupied"` - Edit protection
- `"Cannot delete room 101 while it is occupied"` - Delete protection
- `"Cannot delete room 101 - it has booking history"` - History protection
- `"Room 102 is not available for transfer"` - Transfer validation

### Error Recovery
- All operations are wrapped in try-catch blocks
- User-friendly error messages displayed via toast notifications
- Form state is preserved on validation errors
- Database transactions ensure data consistency

## 🎨 UI Components

### Main Features
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Statistics update automatically
- **Loading States**: Shows loading indicators during operations
- **Confirmation Dialogs**: Prevents accidental deletions
- **Form Validation**: Real-time validation feedback
- **Accessibility**: Keyboard navigation and screen reader support

### Color Coding
- 🟢 **Green**: Available rooms
- 🔴 **Red**: Occupied rooms
- 🟡 **Yellow**: Unclean rooms
- 🟠 **Orange**: Maintenance rooms
- 🔵 **Blue**: Cleaning rooms
- ⚫ **Gray**: Blocked rooms

## 🔐 Security Features

- **Input Sanitization**: All user inputs are validated
- **SQL Injection Protection**: Using parameterized queries
- **Authorization Checks**: Room operations require proper permissions
- **Audit Trail**: All changes are logged with timestamps
- **Data Integrity**: Foreign key constraints and validation rules

## 🚀 Performance Optimizations

- **Lazy Loading**: Room data loaded on demand
- **Caching**: Frequently accessed data cached
- **Pagination**: Large datasets paginated
- **Debounced Search**: Search input debounced for performance
- **Optimistic Updates**: UI updates immediately, syncs with backend

## 📱 Mobile Responsiveness

- **Touch-friendly**: Large touch targets for mobile
- **Responsive Grid**: Adapts to different screen sizes
- **Collapsible Filters**: Filters collapse on mobile
- **Swipe Actions**: Swipe gestures for common actions
- **Mobile-first**: Designed for mobile first, enhanced for desktop

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Database with room table

### Installation
```bash
npm install
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Create new room with all fields
- [ ] Edit room details
- [ ] Delete room (available)
- [ ] Try to delete occupied room (should fail)
- [ ] Transfer guest between rooms
- [ ] Update room status
- [ ] Search and filter rooms
- [ ] View room booking history

### Automated Testing
```bash
npm run test
npm run test:e2e
```

## 📈 Future Enhancements

### Planned Features
- **Room Photos**: Upload and manage room photos
- **Pricing History**: Track price changes over time
- **Maintenance Scheduling**: Schedule maintenance tasks
- **Room Inspections**: Digital room inspection forms
- **Inventory Tracking**: Track room inventory items
- **Guest Preferences**: Store guest room preferences
- **Room Analytics**: Advanced analytics and reporting
- **Integration**: Connect with booking systems

### API Extensions
- **Bulk Operations**: Create/update multiple rooms
- **Room Templates**: Predefined room configurations
- **Import/Export**: CSV import/export functionality
- **Webhooks**: Real-time notifications for room changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for modern hotel management** 