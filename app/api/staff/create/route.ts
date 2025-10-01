import { NextRequest, NextResponse } from "next/server"
import { supabaseAuth, supabaseAdmin } from "@/lib/supabase"

// Admin-only endpoint to create a staff user with auth + staff profile
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin client not available" }, { status: 500 })
    }

    const body = await req.json()
    const { name, email, phone, role, department, permissions, password } = body || {}

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields (name, email, role)" }, { status: 400 })
    }

    const tempPassword = password && String(password).length >= 8 ? password : Math.random().toString(36).slice(-10) + "A1!"

    // Check if staff already exists
    const { data: existingStaff, error: existingErr } = await supabaseAdmin
      .from("staff")
      .select("id, email, auth_user_id")
      .eq("email", email)
      .maybeSingle()

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 })
    }
    if (existingStaff) {
      return NextResponse.json({ error: "A staff member with this email already exists." }, { status: 400 })
    }

    // Create auth user
    const { data: authData, error: signUpErr } = await supabaseAuth.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: { name, phone, role, department }
      }
    })
    if (signUpErr) {
      return NextResponse.json({ error: signUpErr.message || "Failed to create auth user" }, { status: 400 })
    }
    const authUserId = authData.user?.id
    if (!authUserId) {
      return NextResponse.json({ error: "Auth user not created" }, { status: 500 })
    }

    // Insert staff profile
    const { data: staffRow, error: staffErr } = await supabaseAdmin
      .from("staff")
      .insert({
        name,
        email,
        phone: phone || null,
        role,
        department: department || null,
        permissions: Array.isArray(permissions) ? permissions : (role === 'Admin' ? ['all'] : ['bookings','checkin','rooms']),
        status: "active",
        join_date: new Date().toISOString().split("T")[0],
        auth_user_id: authUserId
      })
      .select("id, name, email, role, department, permissions")
      .single()

    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, staff: staffRow, password: tempPassword })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}


