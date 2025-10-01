import { createClient } from "@supabase/supabase-js"

// Hotel database configurations with separate table prefixes
const HOTEL_DATABASES = {
  hotel_001: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    tablePrefix: 'hotel001_'
  },
  hotel_002: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    tablePrefix: 'hotel002_'
  }
}

// Function to get hotel-specific database client with table prefix
export function getHotelDatabase(hotelId: string) {
  const config = HOTEL_DATABASES[hotelId as keyof typeof HOTEL_DATABASES]
  if (!config) {
    throw new Error(`Hotel database not found: ${hotelId}`)
  }

  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false }
  })

  const adminClient = config.serviceKey 
    ? createClient(config.url, config.serviceKey, {
        auth: { persistSession: false }
      })
    : null

  // Create a wrapper that automatically prefixes table names
  const createPrefixedClient = (baseClient: any) => {
    return {
      ...baseClient,
      from: (tableName: string) => {
        const prefixedTableName = `${config.tablePrefix}${tableName}`
        return baseClient.from(prefixedTableName)
      }
    }
  }

  return {
    client: createPrefixedClient(client),
    adminClient: adminClient ? createPrefixedClient(adminClient) : null,
    tablePrefix: config.tablePrefix,
    rawClient: client,
    rawAdminClient: adminClient
  }
}

// Default client for general operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Auth-specific client
export const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false }
  }
)

// Admin client
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false }
      }
    )
  : null

// Hotel service
export const hotelService = {
  getAvailableHotels() {
    return [
      { id: 'hotel_001', name: 'Hotel 001', status: 'active', tablePrefix: 'hotel001_' },
      { id: 'hotel_002', name: 'Hotel 002', status: 'active', tablePrefix: 'hotel002_' }
    ]
  },

  getHotelDatabase(hotelId: string) {
    return getHotelDatabase(hotelId)
  },

  // Function to create hotel-specific tables
  async createHotelTables(hotelId: string) {
    const { rawAdminClient, tablePrefix } = getHotelDatabase(hotelId)
    
    if (!rawAdminClient) {
      throw new Error('Admin client not available')
    }

    const tables = [
      // Staff table
      `CREATE TABLE IF NOT EXISTS ${tablePrefix}staff (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        auth_user_id UUID REFERENCES auth.users(id),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        role TEXT NOT NULL,
        department TEXT,
        permissions TEXT[],
        status TEXT DEFAULT 'active',
        join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Guests table
      `CREATE TABLE IF NOT EXISTS ${tablePrefix}guests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address JSONB,
        nationality TEXT,
        id_type TEXT,
        id_number TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Room types table
      `CREATE TABLE IF NOT EXISTS ${tablePrefix}room_types (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        beds INTEGER NOT NULL,
        baths INTEGER NOT NULL,
        max_occupancy INTEGER NOT NULL,
        amenities TEXT[],
        description TEXT,
        images TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Rooms table
      `CREATE TABLE IF NOT EXISTS ${tablePrefix}rooms (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        number TEXT UNIQUE NOT NULL,
        room_type_id UUID REFERENCES ${tablePrefix}room_types(id),
        floor INTEGER NOT NULL,
        status TEXT DEFAULT 'available',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Bookings table
      `CREATE TABLE IF NOT EXISTS ${tablePrefix}bookings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        guest_id UUID REFERENCES ${tablePrefix}guests(id),
        check_in TIMESTAMP WITH TIME ZONE NOT NULL,
        check_out TIMESTAMP WITH TIME ZONE NOT NULL,
        status TEXT DEFAULT 'confirmed',
        total_amount DECIMAL(10,2) DEFAULT 0,
        advance_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Booking rooms table
      `CREATE TABLE IF NOT EXISTS ${tablePrefix}booking_rooms (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        booking_id UUID REFERENCES ${tablePrefix}bookings(id),
        room_id UUID REFERENCES ${tablePrefix}rooms(id),
        room_rate DECIMAL(10,2) NOT NULL,
        adults INTEGER NOT NULL,
        children INTEGER NOT NULL,
        extra_beds INTEGER DEFAULT 0,
        room_total DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Payment breakdown table
      `CREATE TABLE IF NOT EXISTS ${tablePrefix}payment_breakdown (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        booking_id UUID REFERENCES ${tablePrefix}bookings(id),
        total_amount DECIMAL(10,2) DEFAULT 0,
        advance_cash DECIMAL(10,2) DEFAULT 0,
        advance_card DECIMAL(10,2) DEFAULT 0,
        advance_upi DECIMAL(10,2) DEFAULT 0,
        advance_bank DECIMAL(10,2) DEFAULT 0,
        outstanding_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ]

    for (const tableQuery of tables) {
      const { error } = await rawAdminClient.rpc('exec_sql', { sql: tableQuery })
      if (error) {
        console.error(`Error creating table for ${hotelId}:`, error)
        throw error
      }
    }

    return { message: `Tables created successfully for ${hotelId}` }
  }
}