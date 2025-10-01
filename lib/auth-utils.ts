import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

export interface SessionInfo {
  isAuthenticated: boolean
  user?: {
    id: string
    email: string
    name: string
    role: string
    staffId: string
  }
  expiresAt?: Date
  timeUntilExpiry?: number // in milliseconds
}

/**
 * Get session information from JWT token
 */
export async function getSessionInfo(request: NextRequest): Promise<SessionInfo> {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return { isAuthenticated: false }
    }

    const expiresAt = token.exp ? new Date(token.exp * 1000) : undefined
    const timeUntilExpiry = expiresAt ? expiresAt.getTime() - Date.now() : undefined

    return {
      isAuthenticated: true,
      user: {
        id: token.sub || '',
        email: token.email || '',
        name: token.name || '',
        role: token.role || '',
        staffId: token.staffId || ''
      },
      expiresAt,
      timeUntilExpiry
    }
  } catch (error) {
    console.error('Error getting session info:', error)
    return { isAuthenticated: false }
  }
}

/**
 * Check if session is expired or will expire soon
 */
export function isSessionExpired(sessionInfo: SessionInfo, bufferMinutes: number = 5): boolean {
  if (!sessionInfo.isAuthenticated || !sessionInfo.timeUntilExpiry) {
    return true
  }
  
  // Consider expired if it expires within the buffer time
  return sessionInfo.timeUntilExpiry <= (bufferMinutes * 60 * 1000)
}

/**
 * Format time until expiry for display
 */
export function formatTimeUntilExpiry(timeUntilExpiry: number): string {
  const hours = Math.floor(timeUntilExpiry / (1000 * 60 * 60))
  const minutes = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Session duration constants
 */
export const SESSION_CONFIG = {
  DURATION_HOURS: 168, // 7 days (24 * 7)
  REFRESH_INTERVAL_HOURS: 1,
  WARNING_MINUTES: 15, // Show warning when session expires in 15 minutes
  BUFFER_MINUTES: 5,   // Consider expired 5 minutes before actual expiry
} as const

