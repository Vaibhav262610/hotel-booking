// Report type definitions and mappings
export type ReportType = 
  | "day-settlement"
  | "checkin-checkout"
  | "occupancy-vacant"
  | "expected-checkout"
  | "police-report"
  | "food-plan-report"
  | "arrival-report"
  | "log-report"
  | "complimentary-checkin-report"
  | "cancelled-checkin-report"
  | "blocked-rooms-report"
  | "rooms-transfers-report"
  | "foreigner-report"
  | "early-checkin-late-checkout-report"
  | "occupancy-analysis-report"
  | "sales-day-book-report"
  | "daily-status-report"
  | "sales-report"
  | "roomwise-report"
  | "revenue-chart"
  | "revenue-wise-report"
  | "referal-commission-report"
  | "high-balance-report"
  | "collection-report"
  | "tariff-report"
  | "meal-plan-cost-report"

// Log report sub-types
export type LogReportType = 
  | "arrival-report"
  | "pax-tariff-discount-report"
  | "charges-report"
  | "pax-report"
  | "voucher-report"

// Also export as a value for compatibility
export const ReportTypeValues = [
  "day-settlement",
  "checkin-checkout",
  "occupancy-vacant",
  "expected-checkout",
  "police-report",
  "food-plan-report",
  "arrival-report",
  "log-report",
  "complimentary-checkin-report",
  "cancelled-checkin-report",
  "blocked-rooms-report",
  "rooms-transfers-report",
  "foreigner-report",
  "early-checkin-late-checkout-report",
  "occupancy-analysis-report",
  "sales-day-book-report",
  "daily-status-report",
  "sales-report",
  "roomwise-report",
  "revenue-chart",
  "revenue-wise-report",
  "referal-commission-report",
  "high-balance-report",
  "collection-report",
  "tariff-report",
  "meal-plan-cost-report"
] as const

export interface ReportConfig {
  id: ReportType
  title: string
  description: string
  category: "non-revenue" | "revenue"
}

export const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  // Non Revenue Reports
  "checkin-checkout": {
    id: "checkin-checkout",
    title: "Checkin / Checkout Report",
    description: "Detailed report of guest check-ins and check-outs",
    category: "non-revenue"
  },
  "occupancy-vacant": {
    id: "occupancy-vacant",
    title: "Occupancy / Vacant Report",
    description: "Room occupancy and vacancy status report",
    category: "non-revenue"
  },
  "expected-checkout": {
    id: "expected-checkout",
    title: "Expected CheckOut Report",
    description: "List of guests expected to check out",
    category: "non-revenue"
  },
  "police-report": {
    id: "police-report",
    title: "Police Report",
    description: "Guest information for police reporting",
    category: "non-revenue"
  },
  "food-plan-report": {
    id: "food-plan-report",
    title: "Food Plan Report",
    description: "Meal plan and guest feeding requirements report",
    category: "non-revenue"
  },
  "arrival-report": {
    id: "arrival-report",
    title: "Arrival Report",
    description: "Expected arrivals and guest details",
    category: "non-revenue"
  },
  "log-report": {
    id: "log-report",
    title: "Log Report",
    description: "System activity and operation logs with multiple sub-reports",
    category: "non-revenue"
  },
  "complimentary-checkin-report": {
    id: "complimentary-checkin-report",
    title: "Complimentary CheckIn Report",
    description: "Complimentary check-in details",
    category: "non-revenue"
  },
  "cancelled-checkin-report": {
    id: "cancelled-checkin-report",
    title: "Cancelled CheckIn Report",
    description: "Cancelled check-in details",
    category: "non-revenue"
  },
  "blocked-rooms-report": {
    id: "blocked-rooms-report",
    title: "Blocked Rooms Report",
    description: "Currently blocked and unavailable rooms",
    category: "non-revenue"
  },
  "rooms-transfers-report": {
    id: "rooms-transfers-report",
    title: "Rooms Transfers Report",
    description: "Room transfer and movement details",
    category: "non-revenue"
  },
  "foreigner-report": {
    id: "foreigner-report",
    title: "Foreigner Report",
    description: "Foreign guest information and details",
    category: "non-revenue"
  },
  "early-checkin-late-checkout-report": {
    id: "early-checkin-late-checkout-report",
    title: "Early Checkin/Late Checkout Report",
    description: "Early check-ins and late check-outs",
    category: "non-revenue"
  },

  // Revenue Reports
  "day-settlement": {
    id: "day-settlement",
    title: "Day Settlement Report",
    description: "Daily financial settlement and revenue summary",
    category: "revenue"
  },
  "occupancy-analysis-report": {
    id: "occupancy-analysis-report",
    title: "Occupancy Analysis Report",
    description: "Detailed occupancy analysis and trends",
    category: "revenue"
  },
  "sales-day-book-report": {
    id: "sales-day-book-report",
    title: "Sales Day Book Report",
    description: "Daily sales transactions and records",
    category: "revenue"
  },
  "daily-status-report": {
    id: "daily-status-report",
    title: "Daily Status Report",
    description: "Daily operational status summary",
    category: "revenue"
  },
  "sales-report": {
    id: "sales-report",
    title: "Sales Report",
    description: "Comprehensive sales performance report",
    category: "revenue"
  },
  "roomwise-report": {
    id: "roomwise-report",
    title: "Roomwise Report",
    description: "Revenue and performance by room",
    category: "revenue"
  },
  "revenue-chart": {
    id: "revenue-chart",
    title: "Revenue Chart",
    description: "Visual revenue trends and charts",
    category: "revenue"
  },
  "revenue-wise-report": {
    id: "revenue-wise-report",
    title: "Revenue Wise Report",
    description: "Revenue analysis by various categories",
    category: "revenue"
  },
  "referal-commission-report": {
    id: "referal-commission-report",
    title: "Referal Commission Report",
    description: "Referral commissions and payouts",
    category: "revenue"
  },
  "high-balance-report": {
    id: "high-balance-report",
    title: "High Balance Report",
    description: "High balance accounts and outstanding amounts",
    category: "revenue"
  },
  "collection-report": {
    id: "collection-report",
    title: "Collection Report",
    description: "Payment collections and outstanding amounts",
    category: "revenue"
  },
  "tariff-report": {
    id: "tariff-report",
    title: "Tariff Report",
    description: "Room tariffs and pricing analysis",
    category: "revenue"
  },
  "meal-plan-cost-report": {
    id: "meal-plan-cost-report",
    title: "Meal Plan Cost Report",
    description: "Meal plan costs and revenue analysis",
    category: "revenue"
  }
}

export const DEFAULT_REPORT: ReportType = "day-settlement"

// Log report configurations
export const LOG_REPORT_CONFIGS: Record<LogReportType, { title: string; description: string }> = {
  "arrival-report": {
    title: "Arrival Report",
    description: "Guest arrival details and information"
  },
  "pax-tariff-discount-report": {
    title: "Pax Tariff & Discount Report",
    description: "Guest count, tariff rates, and discount information"
  },
  "charges-report": {
    title: "Charges Report",
    description: "Detailed charges and billing information"
  },
  "pax-report": {
    title: "Pax Report",
    description: "Guest count and occupancy details"
  },
  "voucher-report": {
    title: "Voucher Report",
    description: "Voucher usage and redemption details"
  }
}

export const NON_REVENUE_REPORTS: ReportType[] = [
  "checkin-checkout",
  "occupancy-vacant",
  "expected-checkout",
  "police-report",
  "food-plan-report",
  "arrival-report",
  "log-report",
  "complimentary-checkin-report",
  "cancelled-checkin-report",
  "blocked-rooms-report",
  "rooms-transfers-report",
  "foreigner-report",
  "early-checkin-late-checkout-report"
]

export const REVENUE_REPORTS: ReportType[] = [
  "day-settlement",
  "occupancy-analysis-report",
  "sales-day-book-report",
  "daily-status-report",
  "sales-report",
  "roomwise-report",
  "revenue-chart",
  "revenue-wise-report",
  "referal-commission-report",
  "high-balance-report",
  "collection-report",
  "tariff-report",
  "meal-plan-cost-report"
]
