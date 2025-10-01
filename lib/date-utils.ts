// Date utility functions to handle timezone issues and date formatting

/**
 * Convert a Date object to YYYY-MM-DD format without timezone issues
 */
export function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if a date is in the past
 */
export function isDateInPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < today
}

/**
 * Check if a date is today
 */
export function isDateToday(date: Date): boolean {
  const today = new Date()
  return formatDateForDatabase(date) === formatDateForDatabase(today)
}

/**
 * Get the difference in days between two dates
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const timeDiff = date2.getTime() - date1.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

/**
 * Check if two date ranges overlap
 */
export function doDatesOverlap(
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): boolean {
  // Convert to start of day for accurate comparison
  const s1 = new Date(start1)
  const e1 = new Date(end1)
  const s2 = new Date(start2)
  const e2 = new Date(end2)
  
  s1.setHours(0, 0, 0, 0)
  e1.setHours(0, 0, 0, 0)
  s2.setHours(0, 0, 0, 0)
  e2.setHours(0, 0, 0, 0)
  
  // Check for overlap: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1
}

/**
 * Validate check-in and check-out dates
 */
export function validateBookingDates(checkInDate: Date, checkOutDate: Date): {
  isValid: boolean
  error?: string
} {
  // Check if check-in is in the past
  if (isDateInPast(checkInDate)) {
    return {
      isValid: false,
      error: "Check-in date cannot be in the past"
    }
  }

  // Check if check-out is before check-in
  if (checkOutDate < checkInDate) {
    return {
      isValid: false,
      error: "Check-out date cannot be before check-in date"
    }
  }

  // Check if stay is too long (more than 30 days)
  const daysDiff = getDaysDifference(checkInDate, checkOutDate)
  if (daysDiff > 30) {
    return {
      isValid: false,
      error: "Stay duration cannot exceed 30 days"
    }
  }

  return { isValid: true }
}

/**
 * Check if two time ranges overlap on the same day
 */
export function doTimesOverlap(
  start1: string, end1: string,  // "14:00", "18:00"
  start2: string, end2: string   // "16:00", "20:00"  
): boolean {
  return start1 < end2 && end1 > start2
} 