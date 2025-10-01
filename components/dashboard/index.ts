// Main dashboard components
export { DashboardHeader } from "./dashboard-header"
export { DashboardStats } from "./dashboard-stats"
export { QuickActions } from "./quick-actions"
export { TodaysSummary } from "./todays-summary"

// Dialog components
export { QuickCheckinDialog } from "./dialogs/quick-checkin-dialog"
export { NewBookingDialog } from "./dialogs/new-booking-dialog"
export { CheckInDialog } from "./dialogs/checkin-dialog"
export { CheckOutDialog } from "./dialogs/checkout-dialog"
export { NewReservationDialog } from "./dialogs/new-reservation-dialog"
export { HousekeepingDialog } from "./dialogs/housekeeping-dialog"

// Hooks
export { useDashboardData } from "./hooks/use-dashboard-data"
export { useTaxCalculation } from "./hooks/use-tax-calculation"
export { useRoomAvailability } from "./hooks/use-room-availability"

// Types
export type {
  DashboardStats,
  Room,
  Staff,
  Booking,
  Guest,
  TaxCalculation,
  QuickCheckInData,
  NewBookingData,
  SplitPaymentData,
  RoomAvailability,
  DashboardStatCard
} from "./types"
