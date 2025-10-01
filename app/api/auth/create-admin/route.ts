import { NextRequest, NextResponse } from "next/server"
import { supabaseAuth, supabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin client not available" }, { status: 500 })
    }

    const email = "admin@hotel.local"
    const password = "Admin@12345"
    const name = "System Admin"

    // First, try to delete existing admin if it exists
    const { data: existingStaff } = await supabaseAdmin
      .from("staff")
      .select("auth_user_id")
      .eq("email", email)
      .single()

    if (existingStaff?.auth_user_id) {
      // Delete from auth.users
      await supabaseAuth.auth.admin.deleteUser(existingStaff.auth_user_id)
      
      // Delete from staff table
      await supabaseAdmin
        .from("staff")
        .delete()
        .eq("email", email)
    }

    // Create new auth user
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

    return NextResponse.json({ 
      success: true, 
      email, 
      password,
      message: "Admin account created successfully"
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
