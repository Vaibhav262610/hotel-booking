import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Log authentication status for debugging
    console.log('Middleware check:', {
      path: req.nextUrl.pathname,
      hasToken: !!req.nextauth.token,
      user: req.nextauth.token?.email || 'No user'
    })
    
    // If user is authenticated and trying to access login page, redirect to dashboard
    if (req.nextauth.token && req.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        const isAuthed = !!token
        const role = (token as any)?.role || ''

        // Publicly accessible routes (allow non-authed): login only
        if (path.startsWith('/login')) return true

        // Disable public signup entirely; redirect handled above
        if (path.startsWith('/signup') || path.startsWith('/api/auth/signup')) {
          return false
        }

        // Front office permissions: allow check-in/checkout operations for Front Office Staff/Admin/Owner
        const isFrontOfficeArea = (
          path.startsWith('/rooms') ||
          path.startsWith('/reservations') ||
          path.startsWith('/checkout') ||
          path.startsWith('/api/checkout')
        )
        if (isFrontOfficeArea) {
          return isAuthed && (role === 'Front Office Staff' || role === 'Admin' || role === 'Owner')
        }

        // Settings and staff management: Admin/Owner only
        const isAdminArea = (
          path.startsWith('/settings') ||
          path.startsWith('/staff') ||
          path.startsWith('/api/staff') ||
          path.startsWith('/master')
        )
        if (isAdminArea) {
          return isAuthed && (role === 'Admin' || role === 'Owner')
        }

        // Housekeeping: Housekeeping Manager/Staff/Admin/Owner only
        const isHousekeepingArea = (
          path.startsWith('/housekeeping') ||
          path.startsWith('/api/housekeeping')
        )
        if (isHousekeepingArea) {
          return isAuthed && (role === 'Housekeeping Manager' || role === 'Housekeeping Staff' || role === 'Admin' || role === 'Owner')
        }

        // Reports: Admin/Owner only (sensitive financial data)
        const isReportsArea = (
          path.startsWith('/reports') ||
          path.startsWith('/api/reports')
        )
        if (isReportsArea) {
          return isAuthed && (role === 'Admin' || role === 'Owner')
        }

        // Staff logs: Admin/Owner only
        const isStaffLogsArea = (
          path.startsWith('/staff-logs') ||
          path.startsWith('/api/staff-logs')
        )
        if (isStaffLogsArea) {
          return isAuthed && (role === 'Admin' || role === 'Owner')
        }

        // General dashboard and bookings: any authenticated role
        if (path === '/' || path.startsWith('/bookings') || path.startsWith('/guests') || path.startsWith('/noor-ai')) {
          return isAuthed
        }

        // Default: require authentication
        return isAuthed
      }
    }
  }
)

export const config = {
  matcher: [
    // Protect home route
    "/",
    // Protect all dashboard routes
    "/bookings/:path*",
    "/guests/:path*", 
    "/housekeeping/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/staff/:path*",
    "/rooms/:path*",
    "/reservations/:path*",
    "/noor-ai/:path*",
    "/staff-logs/:path*"
    // Note: /login and /signup are excluded to allow authentication
  ],
}


