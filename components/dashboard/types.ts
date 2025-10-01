export interface DashboardStats {
  totalRevenue: number
  occupiedRooms: number
  totalRooms: number
  checkInsToday: number
  pendingHousekeeping: number
  availableRooms: number
}

// Import types from supabase to ensure compatibility
import type { Room, Staff, Booking } from "@/lib/supabase"

// Re-export for dashboard use
export type { Room, Staff, Booking }

export interface Guest {
  id: string
  name: string
  email?: string
  phone: string
  address?: {
    street_address: string
    city: string
    postal_code: string
    state: string
    country: string
  } | string | null
  id_type: string
  id_number: string
}

export interface TaxCalculation {
  subtotal: number
  gst: number
  cgst: number
  sgst: number
  luxuryTax: number
  serviceCharge: number
  totalTax: number
  grandTotal: number
  nights: number
}

export interface QuickCheckInData {
  roomId: string
  advanceAmount: number
  paymentMethod: string
  totalAmount: number
  taxCalculation: TaxCalculation | null
}

export interface NewBookingData {
  roomId: string
  advanceAmount: number
  paymentMethod: string
  totalAmount: number
  taxCalculation: TaxCalculation | null
}

export interface SplitPaymentData {
  advanceMethod: string
  remainingMethod: string
  advanceAmount: number
  remainingAmount: number
  paymentType: "full" | "advance" | "checkout"
}

export interface RoomAvailability {
  available: boolean
  message: string
  checking: boolean
}

export interface DashboardStatCard {
  title: string
  value: string
  change: string
  icon: any
  color: string
}
