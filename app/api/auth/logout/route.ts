import { NextResponse } from "next/server"

export async function POST() {
  // Client should clear session via next-auth signOut; this endpoint exists for convenience
  return NextResponse.redirect(new URL("/api/auth/signout?callbackUrl=/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))
}


