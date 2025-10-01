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
    
    // If user is authenticated and trying to access login/signup, redirect to dashboard
    if (req.nextauth.token && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user has a valid token
        const isAuthorized = !!token
        
        // Log authorization result
        console.log('Authorization check:', {
          path: req.nextUrl.pathname,
          authorized: isAuthorized,
          hasToken: !!token
        })
        
        return isAuthorized
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


