# Dashboard Components

This directory contains the modularized dashboard components for the hotel management system. The original monolithic `page.tsx` file has been broken down into smaller, reusable components for better maintainability and code organization.

## Structure

```
components/dashboard/
├── types.ts                    # Shared TypeScript interfaces and types
├── index.ts                    # Barrel exports for clean imports
├── README.md                   # This documentation
├── dashboard-header.tsx        # Main dashboard header with action buttons
├── dashboard-stats.tsx         # Statistics cards component
├── quick-actions.tsx           # Sidebar quick actions component
├── todays-summary.tsx          # Today's summary card component
├── hooks/                      # Custom React hooks
│   ├── use-dashboard-data.ts   # Data fetching and state management
│   ├── use-tax-calculation.ts  # Tax calculation logic
│   └── use-room-availability.ts # Room availability checking
└── dialogs/                    # Modal dialog components
    ├── quick-checkin-dialog.tsx    # Quick check-in form
    ├── new-booking-dialog.tsx      # New booking form
    ├── checkin-dialog.tsx          # Check-in existing booking
    ├── checkout-dialog.tsx         # Check-out guest
    ├── new-reservation-dialog.tsx  # New reservation form
    └── housekeeping-dialog.tsx     # Housekeeping task creation
```

## Key Improvements

### 1. **Separation of Concerns**
- **Data Logic**: Extracted to custom hooks (`use-dashboard-data.ts`, `use-tax-calculation.ts`, `use-room-availability.ts`)
- **UI Components**: Each dialog and section is now a separate component
- **Types**: Centralized type definitions in `types.ts`

### 2. **Reusability**
- Components can be easily reused across different pages
- Hooks can be shared between components
- Types ensure consistency across the application

### 3. **Maintainability**
- Each component has a single responsibility
- Easier to test individual components
- Simpler to debug and modify specific functionality

### 4. **Performance**
- Components can be individually optimized
- Better tree-shaking opportunities
- Reduced bundle size for specific features

## Usage

### Import Components
```typescript
import { 
  DashboardHeader,
  DashboardStats,
  QuickActions,
  useDashboardData
} from "@/components/dashboard"
```

### Use Custom Hooks
```typescript
const { stats, rooms, staff, bookings, loading, error, refetch } = useDashboardData()
const { calculateHotelTaxes } = useTaxCalculation()
const { checkRoomAvailability } = useRoomAvailability()
```

## Component Responsibilities

### Main Components
- **DashboardHeader**: Header with title, date, and main action buttons
- **DashboardStats**: Statistics cards showing key metrics
- **QuickActions**: Sidebar with quick action buttons
- **TodaysSummary**: Summary of today's activities

### Dialog Components
- **QuickCheckinDialog**: Complete check-in form with payment options
- **NewBookingDialog**: New booking creation form
- **CheckInDialog**: Check-in existing confirmed bookings
- **CheckOutDialog**: Check-out guests with payment collection
- **NewReservationDialog**: Create new reservations
- **HousekeepingDialog**: Assign housekeeping tasks

### Custom Hooks
- **useDashboardData**: Fetches and manages all dashboard data
- **useTaxCalculation**: Handles hotel tax calculations
- **useRoomAvailability**: Manages room availability checking

## Benefits of This Structure

1. **Reduced Complexity**: Main dashboard file went from 2200+ lines to ~100 lines
2. **Better Testing**: Each component can be tested in isolation
3. **Easier Debugging**: Issues can be traced to specific components
4. **Team Collaboration**: Different developers can work on different components
5. **Code Reuse**: Components can be used in other parts of the application
6. **Type Safety**: Centralized types ensure consistency
7. **Performance**: Better code splitting and lazy loading opportunities

## Future Enhancements

- Add unit tests for each component
- Implement error boundaries for better error handling
- Add loading states for individual components
- Consider implementing virtual scrolling for large data sets
- Add accessibility improvements
- Implement component-level caching strategies
