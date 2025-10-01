import { NextRequest, NextResponse } from "next/server"
import { supabaseAuth, supabaseAdmin } from "@/lib/supabase"

// Creates a default admin if none exists. Must be called manually one-time.
// Default credentials: admin@hotel.local / Admin@12345
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin client not available" }, { status: 500 })
    }

    // Check if any admin/owner exists
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .select("id, role")
      .in("role", ["Admin", "Owner"])
      .limit(1)

    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 500 })
    }

    if (staff && staff.length > 0) {
      return NextResponse.json({ success: true, message: "Admin already exists" })
    }

    const email = "admin@hotel.local"
    const password = "Admin@12345"
    const name = "System Admin"

    // Create auth user
    const { data: authData, error: signUpErr } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: "Admin" }
      }
    })
    if (signUpErr) {
      return NextResponse.json({ error: signUpErr.message }, { status: 500 })
    }

    const authUserId = authData.user?.id
    if (!authUserId) {
      return NextResponse.json({ error: "Auth user not created" }, { status: 500 })
    }

    // Create staff record
    const { error: staffInsertErr } = await supabaseAdmin
      .from("staff")
      .insert({
        name,
        email,
        phone: null,
        role: "Admin",
        department: "Management",
        status: "active",
        join_date: new Date().toISOString().split("T")[0],
        permissions: ["all"],
        auth_user_id: authUserId
      })

    if (staffInsertErr) {
      return NextResponse.json({ error: staffInsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, email, password })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}


