import { NextRequest, NextResponse } from "next/server"
import { supabaseAuth, supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin client not available" }, { status: 500 })
    }

    // Get all staff with their auth info
    const { data: staff, error } = await supabaseAdmin
      .from("staff")
      .select("id, name, email, role, auth_user_id")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      staff: staff || [],
      message: "Use these credentials to login"
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
