import { NextRequest, NextResponse } from "next/server"
import { supabaseAuth, supabaseAdmin } from "@/lib/supabase"

// Allowed roles
const ALLOWED_ROLES = new Set(["Owner", "Admin", "Employee"])

export async function POST(req: NextRequest) {
  try {

    const body = await req.json()
    const { email, password, name, phone, role, department } = body || {}

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Create user with password
    const { data: authData, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: { name, phone, role, department }
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create staff profile
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin client not available" }, { status: 500 })
    }

    const { data: staffRecord, error: staffError } = await supabaseAdmin
      .from("staff")
      .insert({
        hotel_id: null,
        name,
        email,
        phone: phone || null,
        role,
        department: department || null,
        status: "active",
        join_date: new Date().toISOString().split("T")[0],
        permissions: role === "Owner" ? ["all"] : role === "Admin" ? ["all"] : ["bookings", "checkin", "rooms"],
        auth_user_id: authData.user?.id
      })
      .select("id, role")
      .single()

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      userId: authData.user?.id, 
      staffId: staffRecord.id, 
      role: staffRecord.role 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected error" }, { status: 500 })
  }
}


