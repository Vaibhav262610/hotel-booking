import { NextRequest, NextResponse } from 'next/server'
import { getHotelDatabase } from '@/lib/hotel-database'

export async function POST(request: NextRequest) {
  try {
    const { hotelId, userType } = await request.json()

    if (!hotelId || !userType) {
      return NextResponse.json({ error: 'Hotel ID and user type are required' }, { status: 400 })
    }

    const validHotels = ['hotel_001', 'hotel_002']
    const validTypes = ['owner', 'admin']
    
    if (!validHotels.includes(hotelId)) {
      return NextResponse.json({ error: 'Invalid hotel ID. Use hotel_001 or hotel_002' }, { status: 400 })
    }
    
    if (!validTypes.includes(userType)) {
      return NextResponse.json({ error: 'Invalid user type. Use owner or admin' }, { status: 400 })
    }

    // Generate credentials based on hotel and user type
    const email = `${userType}${hotelId.replace('_', '')}@hotel.local`
    const password = `${userType}12345`
    const role = userType === 'owner' ? 'Owner' : 'Admin'

    // Get hotel-specific database client
    const { client } = getHotelDatabase(hotelId)

    // Check if user already exists
    const { data: existingAuth, error: existingError } = await client.auth.signInWithPassword({
      email,
      password
    })
    
    if (existingAuth?.user) {
      return NextResponse.json({ 
        message: 'User already exists',
        credentials: {
          email,
          password,
          role,
          hotelId
        }
      })
    }

    // Create auth user in hotel-specific database
    const { data: authData, error: authError } = await client.auth.signUp({
      email,
      password
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create staff profile in hotel-specific database with prefixed table
    const { data: staffData, error: staffError } = await client
      .from('staff')
      .insert({
        auth_user_id: authData.user?.id,
        name: `${role} ${hotelId}`,
        email: email,
        phone: '',
        role: role,
        department: 'Management',
        permissions: ['all'],
        status: 'active',
        join_date: new Date().toISOString()
      })
      .select()
      .single()

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'User created successfully',
      credentials: {
        email,
        password,
        role,
        hotelId
      },
      staff: staffData
    })

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
