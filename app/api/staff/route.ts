import { NextRequest, NextResponse } from 'next/server'
import { staffService } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const staff = await staffService.getStaff()
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    )
  }
} 