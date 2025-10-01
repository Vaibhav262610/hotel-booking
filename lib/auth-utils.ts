import { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export interface SessionInfo {
  id?: string
  email?: string | null
  name?: string | null
  role?: string
  staffId?: string
  isAuthenticated: boolean
}

export async function getSessionInfo(request: NextRequest): Promise<SessionInfo> {
  try {
    const token = await getToken({ req: request })
    
    if (!token) {
      return { isAuthenticated: false }
    }

    return {
      id: token.sub,
      email: token.email,
      name: token.name,
      role: (token as any).role,
      staffId: (token as any).staffId,
      isAuthenticated: true
    }
  } catch (error) {
    console.error('Error getting session info:', error)
    return { isAuthenticated: false }
  }
}

export function isSessionExpired(sessionInfo: SessionInfo, bufferMinutes: number = 5): boolean {
  // This would need to be implemented based on your token expiration logic
  return false
}

// Role-based access control utilities
export function hasRole(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

export function isAdmin(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Admin', 'Owner'])
}

export function isOwner(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Owner'])
}

export function isFrontOfficeStaff(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Front Office Staff', 'Admin', 'Owner'])
}

export function isHousekeepingStaff(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Housekeeping Manager', 'Housekeeping Staff', 'Admin', 'Owner'])
}

export function canAccessReports(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Admin', 'Owner'])
}

export function canAccessStaffManagement(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Admin', 'Owner'])
}

export function canAccessSettings(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Admin', 'Owner'])
}

export function canAccessMasterData(userRole: string | undefined): boolean {
  return hasRole(userRole, ['Admin', 'Owner'])
}

// Session configuration
export const SESSION_CONFIG = {
  WARNING_MINUTES: 15, // Show warning 15 minutes before expiry
  BUFFER_MINUTES: 5,   // Critical warning 5 minutes before expiry
}

// Format time until expiry for display
export function formatTimeUntilExpiry(timeLeft: number): string {
  if (timeLeft <= 0) return "0 minutes"
  
  const minutes = Math.floor(timeLeft / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  } else {
    return `${minutes}m`
  }
}