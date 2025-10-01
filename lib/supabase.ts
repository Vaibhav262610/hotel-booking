import { createClient } from "@supabase/supabase-js"
import { formatDateForDatabase, validateBookingDates, doDatesOverlap } from "./date-utils"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY


// Main client for general operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth-specific client with no session persistence (for auth operations)
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
})

// Admin client with service role key (for admin operations)
// Only create if service role key is available
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })
  : null

// Helper function to get the first hotel ID from the database
async function getHotelId(): Promise<string> {
  const { data: hotels, error } = await supabase
    .from("hotels")
    .select("id")
    .limit(1)
    .single()

  if (error || !hotels) {
    throw new Error('No hotel found in database. Please add a hotel first.')
  }

  return hotels.id
}

// Types for our database tables
export interface Hotel {
  id: string
  name: string
  address: string
  phone: string
  email: string
  currency: string
  timezone: string
  language: string
  created_at: string
  updated_at: string
}

export interface RoomType {
  id: string
  code: string
  name: string
  base_price: number
  beds: number
  baths: number
  max_pax?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  hotel_id: string
  number: string
  room_type_id: string
  floor: number
  price: number
  status: 'available' | 'occupied' | 'reserved' | 'blocked'
  amenities: string
  created_at: string
  updated_at: string
  room_type?: RoomType
}

export interface Staff {
  id: string
  hotel_id: string
  auth_user_id?: string
  name: string
  email: string
  phone: string
  role: 'Owner' | 'Admin' | 'Employee' | 'Front Office Staff' | 'Housekeeping Manager' | 'Housekeeping Staff'
  department: string
  status: string
  join_date: string
  last_login?: string
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  name: string
  email: string
  phone: string
  address: {
    street_address: string
    city: string
    postal_code: string
    state: string
    country: string
  } | string | null // Allow for string or null since the database might store it differently
  id_type: string
  id_number: string
  title?: string
  first_name?: string
  last_name?: string
  date_of_birth?: string
  nationality?: string
  passport_number?: string
  company?: string
  designation?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  guest_category?: string
  loyalty_points?: number
  total_stays?: number
  total_spent?: number
  last_stay_date?: string
  status?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface GuestPreference {
  id: string
  guest_id: string
  preference_type: string
  preference_value: string
  created_at: string
  updated_at: string
}

export interface GuestCommunication {
  id: string
  guest_id: string
  staff_id?: string
  communication_type: string
  subject?: string
  message: string
  status: string
  scheduled_at?: string
  sent_at?: string
  created_at: string
  staff?: Staff
}

export interface GuestDocument {
  id: string
  guest_id: string
  document_type: string
  document_number?: string
  document_url?: string
  expiry_date?: string
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
  staff?: Staff
}

export interface GuestSpecialRequest {
  id: string
  guest_id: string
  booking_id: string
  request_type: string
  request_details: string
  status: string
  assigned_to?: string
  fulfilled_at?: string
  created_at: string
  updated_at: string
  staff?: Staff
}

export interface GuestFeedback {
  id: string
  guest_id: string
  booking_id: string
  rating: number
  category?: string
  feedback_text?: string
  is_anonymous: boolean
  created_at: string
}

export interface GuestLoyalty {
  id: string
  guest_id: string
  tier: string
  points_earned: number
  points_redeemed: number
  points_expired: number
  tier_upgrade_date?: string
  last_activity_date?: string
  created_at: string
  updated_at: string
}

export interface GuestVisit {
  id: string
  guest_id: string
  booking_id: string
  check_in_date: string
  check_out_date: string
  room_type?: string
  total_amount?: number
  points_earned: number
  special_requests_count: number
  feedback_rating?: number
  created_at: string
}

// Additional interfaces for new schema features
export interface CheckoutNotification {
  id: string
  booking_id: string
  guest_name: string
  room_number: string
  check_out_time: string
  notification_type: 'approaching' | 'overdue' | 'grace_period' | 'late_charges'
  message: string
  is_active: boolean
  created_at: string
  dismissed_at?: string
  dismissed_by?: string
}

export interface GracePeriodTracker {
  id: string
  booking_id: string
  original_check_out: string
  grace_period_start: string
  grace_period_end: string
  late_charges: number
  is_active: boolean
  created_at: string
}

export interface LateCheckoutCharge {
  id: string
  booking_id: string
  original_amount: number
  late_checkout_fee: number
  total_amount: number
  reason: string
  applied_at: string
}

export interface ChatHistory {
  id: string
  user_session: string
  role: string
  message: string
  created_at: string
}

export interface Settings {
  id: string
  hotel_id: string
  category: string
  key: string
  value: any
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  booking_number: string
  hotel_id: string
  guest_id: string
  staff_id: string
  check_in: string
  expected_checkout: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'reserved'
  advance_amount?: number
  arrival_type: 'walk_in' | 'phone' | 'online' | 'OTA' | 'agent' | 'corporate'
  special_requests?: string
  actual_check_in?: string
  actual_check_out?: string
  price_adjustment?: number
  checkout_notes?: string
  check_in_notes?: string
  planned_nights?: number
  actual_nights?: number
  number_of_guests?: number
  child_guests?: number
  extra_guests?: number
  total_pax: number
  meal_plan: 'CP' | 'MAP' | 'EP'
  plan_name: string
  purpose?: string
  booked_on: string
  ota_company?: string
  cancellation_reason?: string
  cancel_date?: string
  cancelled_by_staff_id?: string
  created_at: string
  updated_at: string
  guest?: Guest
  staff?: Staff
  booking_rooms?: BookingRoom[]
  payment_breakdown?: BookingPaymentBreakdown
  // Helper properties for backward compatibility and easier access
  room?: {
    id: string
    number: string
    room_type?: {
      name: string
      code: string
      base_price: number
    }
  }
  room_status?: 'reserved' | 'checked_in' | 'checked_out' | 'cancelled'
}

export interface Reservation {
  id: string
  reservation_number: string
  hotel_id: string
  guest_id: string
  room_id: string
  staff_id: string
  check_in: string
  check_out: string
  status: string
  total_amount: number
  advance_amount: number
  payment_method: string
  arrival_type: string
  special_requests: string
  created_at: string
  updated_at: string
  guest?: Guest
  room?: Room
  staff?: Staff
}

// New interfaces for updated schema
export interface BookingRoom {
  id: string
  booking_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  actual_check_in?: string
  actual_check_out?: string
  room_status: 'reserved' | 'checked_in' | 'checked_out' | 'cancelled'
  room_rate?: number
  room_total?: number
  expected_nights?: number
  created_at: string
  updated_at: string
  room?: {
    id: string
    number: string
    room_type?: {
      name: string
      code: string
      base_price: number
    }
  }
}

export interface TaxType {
  id: string
  name: string
  rate: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BookingPaymentBreakdown {
  booking_id: string
  total_amount: number
  advance_cash: number
  advance_card: number
  advance_upi: number
  advance_bank: number
  receipt_cash: number
  receipt_card: number
  receipt_upi: number
  receipt_bank: number
  outstanding_amount: number
  gst_tax_type_id?: string
  cgst_tax_type_id?: string
  sgst_tax_type_id?: string
  luxury_tax_type_id?: string
  service_charge_tax_type_id?: string
  gst_amount: number
  cgst_amount: number
  sgst_amount: number
  luxury_tax_amount: number
  service_charge_amount: number
  total_tax_amount: number
  taxed_total_amount: number
  created_at: string
  updated_at: string
  // Relations
  gst_tax_type?: TaxType
  cgst_tax_type?: TaxType
  sgst_tax_type?: TaxType
  luxury_tax_type?: TaxType
  service_charge_tax_type?: TaxType
}

export interface PaymentTransaction {
  id: string
  booking_id: string
  amount: number
  payment_method: 'upi' | 'card' | 'cash' | 'bank'
  transaction_type: 'advance' | 'receipt'
  collected_by?: string
  transaction_date: string
  reference_number?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
  staff?: Staff
}

export interface CancelledBooking {
  id: string
  booking_id: string
  cancellation_reason: string
  cancel_date: string
  cancelled_by_staff_id?: string
  refund_amount: number
  refund_processed: boolean
  refund_processed_date?: string
  notes?: string
  created_at: string
  updated_at: string
  staff?: Staff
}

export interface BlockedRoom {
  id: string
  room_id: string
  blocked_by_staff_id: string
  blocked_date: string
  blocked_from_date: string
  blocked_to_date: string
  reason: string
  unblocked_date?: string
  unblocked_by_staff_id?: string
  unblock_reason?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
  room?: Room
  blocked_by_staff?: Staff
  unblocked_by_staff?: Staff
}

export interface HousekeepingTask {
  id: string
  task_number: string
  hotel_id: string
  room_id: string
  assigned_to?: string
  type: string
  status: string
  priority: string
  estimated_time: number
  notes?: string
  scheduled_date?: string // Optional since your table doesn't have this column
  created_at: string
  updated_at?: string
  room?: {
    number: string
    type: string
    status: string
  }
  staff?: {
    name: string
    role: string
  }
}

export interface StaffLog {
  id: string
  hotel_id: string
  staff_id: string
  action: string
  details: string
  ip_address: string
  created_at: string
  staff?: Staff
}

// Database service functions
export const hotelService = {
  async getHotel() {
    const { data, error } = await supabase.from("hotels").select("*").single()

    if (error) throw error
    return data as Hotel
  },
}

// New service for room types
export const roomTypeService = {
  async getRoomTypes() {
    const { data, error } = await supabase
      .from("room_types")
      .select("id, code, name, base_price, beds, baths, max_pax, is_active")
      .eq("is_active", true)
      .order("code")

    if (error) throw error
    // Deduplicate by code in case of duplicates
    const uniqueByCode = new Map<string, any>()
    for (const rt of (data || [])) {
      if (!uniqueByCode.has(rt.code)) uniqueByCode.set(rt.code, rt)
    }
    return Array.from(uniqueByCode.values()) as RoomType[]
  },

  async getRoomTypeById(id: string) {
    const { data, error } = await supabase
      .from("room_types")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    return data as RoomType
  },

  async createRoomType(roomTypeData: {
    code: string
    name: string
    base_price: number
    beds: number
    baths: number
    max_pax?: number
  }) {
    const { data, error } = await supabase
      .from("room_types")
      .insert(roomTypeData)
      .select()
      .single()

    if (error) throw error
    return data as RoomType
  },

  async updateRoomType(id: string, roomTypeData: Partial<RoomType>) {
    const { data, error } = await supabase
      .from("room_types")
      .update({
        ...roomTypeData,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as RoomType
  },

  async deleteRoomType(id: string) {
    // Check if any rooms are using this room type
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, number")
      .eq("room_type_id", id)
      .limit(1)

    if (rooms && rooms.length > 0) {
      throw new Error(`Cannot delete room type - it is being used by room ${rooms[0].number}`)
    }

    const { error } = await supabase
      .from("room_types")
      .update({ is_active: false })
      .eq("id", id)

    if (error) throw error
    return true
  }
}

export const roomService = {
  async getAvailableRoomsByType(roomTypeId: string, fromDate: string, toDate: string) {
    // Prefer RPC added via migration; if not present, fallback to inline query
    try {
      const { data, error } = await supabase.rpc('get_available_rooms_by_type', {
        p_room_type_id: roomTypeId,
        p_from: fromDate,
        p_to: toDate,
      })
      if (error) throw error
      // Normalize result shape to an array of rooms { id, number }
      let rooms: any[] = []
      if (Array.isArray(data)) {
        rooms = data
      } else if (data && typeof data === 'object') {
        if (Array.isArray((data as any).rooms)) rooms = (data as any).rooms
        else if (Array.isArray((data as any).available)) rooms = (data as any).available
      }
      return rooms
    } catch (_e) {
      // Fallback: inline query using overlap condition
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, number, maintenance_status, room_type_id')
        .eq('room_type_id', roomTypeId)
        .eq('maintenance_status', 'available')
      if (error) throw error

      const { data: busy, error: brErr } = await supabase
        .from('booking_rooms')
        .select('room_id')
        .in('room_status', ['reserved', 'checked_in'] as any)
        // Overlap: existing.check_in < to AND existing.check_out > from
        .lt('check_in_date', toDate)
        .gt('check_out_date', fromDate)
      if (brErr) throw brErr

      const busySet = new Set((busy || []).map((b: any) => b.room_id))
      const available = (rooms || []).filter((r: any) => !busySet.has(r.id))
      return available
    }
  },
  async getRooms() {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        room_type:room_type_id(*)
      `)
      .order("number")

    if (error) throw error
    return data as Room[]
  },

  /**
   * Manually sync all room statuses based on current booking_rooms data
   * This is a utility function to fix any room status inconsistencies
   */
  async syncAllRoomStatuses() {
    try {
      const { error } = await supabase.rpc('sync_all_room_status')
      if (error) throw error
      return { success: true, message: 'All room statuses synced successfully' }
    } catch (error) {
      console.error('Failed to sync room statuses:', error)
      throw new Error(`Failed to sync room statuses: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Get booking with detailed room information for checkout operations
   */
  async getBookingWithRooms(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guest_id(name, email, phone),
          staff:staff_id(name),
          payment_breakdown:booking_payment_breakdown(*),
          booking_rooms(
            id,
            room_id,
            room_status,
            check_in_date,
            check_out_date,
            actual_check_in,
            actual_check_out,
            room:room_id(id, number, status, room_type:room_type_id(name))
          )
        `)
        .eq('id', bookingId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get booking with rooms:', error)
      throw new Error(`Failed to get booking: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async updateRoomType(roomId: string, roomTypeId: string, options?: { syncPrice?: boolean }) {
    // Check for conflicting bookings (reserved/checked_in) for future/overlapping dates
    const today = new Date()
    const { data: conflicts, error: conflictError } = await supabase
      .from('booking_rooms')
      .select('id, check_in_date, check_out_date, room_status')
      .eq('room_id', roomId)
      .in('room_status', ['reserved', 'checked_in'])
      .gte('check_out_date', today.toISOString().slice(0, 10))

    if (conflictError) throw conflictError

    if (conflicts && conflicts.length > 0) {
      // Return a special object for the UI to warn/block
      return { ok: false, reason: 'has_future_reservations', conflicts }
    }

    // Optionally sync price from selected room_type
    let updateData: any = { room_type_id: roomTypeId, updated_at: new Date().toISOString() }
    if (options?.syncPrice) {
      const { data: rtype, error: rtErr } = await supabase
        .from('room_types')
        .select('base_price')
        .eq('id', roomTypeId)
        .single()
      if (rtErr) throw rtErr
      updateData.price = rtype?.base_price ?? null
    }

    const { error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', roomId)

    if (error) throw error

    // Return updated room with joined type
    const { data: updated, error: fetchErr } = await supabase
      .from('rooms')
      .select(`*, room_type:room_type_id(*)`)
      .eq('id', roomId)
      .single()

    if (fetchErr) throw fetchErr
    return { ok: true, room: updated as Room }
  },

  async getRoomById(id: string) {
    const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single()

    if (error) throw error
    return data as Room
  },

  async createRoom(roomData: {
    number: string
    roomTypeId: string
    floor: number
    price?: number
    amenities?: string
    hotelId?: string
    syncPriceToType?: boolean
  }) {
    if (!roomData.number || !roomData.roomTypeId) {
      throw new Error('Missing required fields: number and roomTypeId')
    }

    // Get the actual hotel ID from the database
    const hotelId = roomData.hotelId || await getHotelId()

    // Validate room number uniqueness
    const { data: existingRoom, error: existingErr } = await supabase
      .from("rooms")
      .select("id")
      .eq("number", roomData.number)
      .maybeSingle()

    if (existingErr) {
      throw new Error(`Error checking room number uniqueness: ${existingErr.message}`)
    }

    if (existingRoom) {
      throw new Error(`Room number ${roomData.number} already exists`)
    }

    // Optionally derive price from room_type
    let derivedPrice = roomData.price
    if (roomData.syncPriceToType || derivedPrice == null) {
      const { data: rt } = await supabase
        .from('room_types')
        .select('base_price')
        .eq('id', roomData.roomTypeId)
        .single()
      if (rt) {
        if (derivedPrice == null || roomData.syncPriceToType) derivedPrice = Number(rt.base_price)
      }
    }

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        hotel_id: hotelId,
        number: roomData.number,
        room_type_id: roomData.roomTypeId,
        floor: Number(roomData.floor) || 1,
        price: Number(derivedPrice ?? 0),
        amenities: roomData.amenities || '',
        status: "available",
      })
      .select()
      .single()

    if (error) throw new Error(error.message || 'Insert failed')
    return data as Room
  },

  async updateRoom(id: string, roomData: Partial<Room> & { room_type_id?: string; syncPriceToType?: boolean }) {
    // Check if room is occupied and prevent updates if it is
    const { data: currentRoom } = await supabase
      .from("rooms")
      .select("status")
      .eq("id", id)
      .single()

    if (currentRoom?.status === "occupied") {
      throw new Error("Cannot update room while it is occupied")
    }

    // If updating room number, check for uniqueness
    if (roomData.number) {
      const { data: existingRoom, error: existErr } = await supabase
        .from("rooms")
        .select("id")
        .eq("number", roomData.number)
        .neq("id", id)
        .single()

      if (existErr && existErr.code !== 'PGRST116') {
        throw new Error(existErr.message || 'Room number check failed')
      }

      if (existingRoom) {
        throw new Error(`Room number ${roomData.number} already exists`)
      }
    }

    // Build update payload safely
    const updates: any = {
        ...roomData,
        updated_at: new Date().toISOString(),
    }

    // Coerce numeric fields if provided
    if (updates.floor != null) updates.floor = Number(updates.floor)
    if (updates.price != null) updates.price = Number(updates.price)

    // Handle room_type change with optional price sync
    if (roomData.room_type_id && roomData.syncPriceToType) {
      const { data: rt, error: rtErr } = await supabase
        .from('room_types')
        .select('base_price')
        .eq('id', roomData.room_type_id)
        .single()
      if (rtErr) throw new Error(rtErr.message || 'Failed to load room type')
      updates.price = Number(rt.base_price)
      delete updates.syncPriceToType
    }

    const { data, error } = await supabase
      .from("rooms")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Update failed')
    return data as Room
  },

  async deleteRoom(id: string) {
    // Check if room is occupied
    const { data: room } = await supabase
      .from("rooms")
      .select("status, number")
      .eq("id", id)
      .single()

    if (room?.status === "occupied") {
      throw new Error(`Cannot delete room ${room.number} while it is occupied`)
    }

    // Check if room has any bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", id)
      .limit(1)

    if (bookings && bookings.length > 0) {
      throw new Error(`Cannot delete room ${room?.number} - it has booking history`)
    }

    const { error } = await supabase.from("rooms").delete().eq("id", id)

    if (error) throw error
    return true
  },

  async transferRoom(fromRoomId: string, toRoomId: string, bookingId: string, reason?: string, transferStaffId?: string) {
    try {
      console.log('Processing room transfer:', { fromRoomId, toRoomId, bookingId, reason, transferStaffId });

      // Use the comprehensive database function for room transfer
      const { data: result, error } = await supabase.rpc('process_room_transfer', {
        p_booking_id: bookingId,
        p_from_room_id: fromRoomId,
        p_to_room_id: toRoomId,
        p_reason: reason || 'Room transfer requested',
        p_transfer_staff_id: transferStaffId || null
      });

      if (error) {
        console.error('Room transfer RPC error:', error);
        throw new Error(`Transfer failed: ${error.message}`);
      }

      if (!result || !result.success) {
        const errorMessage = result?.error || 'Transfer failed for unknown reason';
        console.error('Room transfer failed:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Room transfer successful:', result);

      // Get updated booking and room details for response
      const [bookingData, sourceRoomData, targetRoomData, transferRecordData] = await Promise.all([
        supabase.from('bookings').select(`
          *,
          guest:guest_id(name, email, phone),
          staff:staff_id(name),
          booking_rooms(
            id,
            room_id,
            room_status,
            check_in_date,
            check_out_date,
            actual_check_in,
            room:room_id(id, number, room_type:room_type_id(name, code, base_price))
          )
        `).eq('id', bookingId).single(),
        
        supabase.from('rooms').select(`
          id,
          number,
          room_type_id,
          status,
          room_type:room_type_id(name, code, base_price)
        `).eq('id', fromRoomId).single(),
        
        supabase.from('rooms').select(`
          id,
          number,
          room_type_id,
          status,
          room_type:room_type_id(name, code, base_price)
        `).eq('id', toRoomId).single(),
        
        supabase.from('room_transfers').select('*').eq('id', result.transferId).single()
      ]);

      return {
        success: true,
        message: result.message,
        transferId: result.transferId,
        booking: bookingData.data,
        sourceRoom: sourceRoomData.data,
        targetRoom: targetRoomData.data,
        transferRecord: transferRecordData.data
      };

    } catch (error) {
      console.error("Room transfer error:", error);
      throw error;
    }
  },

  // New method to get available rooms for transfer
  async getAvailableRoomsForTransfer(bookingId: string, excludeRoomId?: string) {
    try {
      // Use the database function for getting available rooms
      const { data: availableRooms, error } = await supabase.rpc('get_available_rooms_for_transfer', {
        p_booking_id: bookingId,
        p_exclude_room_id: excludeRoomId || null
      });

      if (error) {
        console.error('Error getting available rooms for transfer:', error);
        throw error;
      }

      // Transform the flat structure to match the expected interface
      return (availableRooms || []).map((room: any) => ({
        id: room.id,
        number: room.number,
        room_type_id: room.room_type_id, // This will be added by the database function
        status: room.status,
        room_type: {
          name: room.name,
          code: room.code,
          base_price: room.base_price
        }
      }));
    } catch (error) {
      console.error("Error getting available rooms for transfer:", error);
      throw error;
    }
  },

  // New method to get transfer history for a booking
  async getTransferHistory(bookingId: string) {
    try {
      const { data, error } = await supabase.rpc('get_room_transfer_history', {
        p_booking_id: bookingId
      });

      if (error) {
        console.error('Error getting transfer history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error getting transfer history:", error);
      throw error;
    }
  },

  async getRoomStats() {
    const { data, error } = await supabase.from("rooms").select("status")

    if (error) throw error

    const stats = {
      total: data.length,
      available: data.filter((room) => room.status === "available").length,
      occupied: data.filter((room) => room.status === "occupied").length,
      maintenance: data.filter((room) => room.status === "maintenance").length,
      unclean: data.filter((room) => room.status === "unclean").length,
      cleaning: data.filter((room) => room.status === "cleaning").length,
      blocked: data.filter((room) => room.status === "blocked").length,
    }

    return stats
  },

  async getRoomsByStatus(status: string) {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("status", status)
      .order("number")

    if (error) throw error
    return data as Room[]
  },

  async getAvailableRooms() {
    return this.getRoomsByStatus("available")
  },

  async getAvailableRoomsForDates(checkInDate: Date, checkOutDate: Date) {
    // First get all rooms
    const { data: allRooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .order("number")

    if (roomsError) throw roomsError

    // Get all bookings for the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("room_id, check_in, check_out, status")
      .in("status", ["confirmed", "checked-in"])

    if (bookingsError) throw bookingsError

    // Filter out rooms that have conflicting bookings
    const availableRooms = allRooms.filter(room => {
      const roomBookings = bookings.filter(booking => booking.room_id === room.id)

      for (const booking of roomBookings) {
        const existingCheckIn = new Date(booking.check_in)
        const existingCheckOut = new Date(booking.check_out)

        if (doDatesOverlap(checkInDate, checkOutDate, existingCheckIn, existingCheckOut)) {
          return false // Room is not available
        }
      }

      return true // Room is available
    })

    return availableRooms as Room[]
  },

  async getOccupiedRooms() {
    return this.getRoomsByStatus("occupied")
  },

  async updateRoomStatus(roomId: string, status: string, reason?: string, assignedStaffId?: string) {
    // Get current room status
    const { data: currentRoom, error: fetchError } = await supabase
      .from("rooms")
      .select("status, number")
      .eq("id", roomId)
      .single()

    if (fetchError) throw fetchError
    if (!currentRoom) throw new Error("Room not found")

    // Validate status transition (be permissive for maintenance/block)
    const validTransitions = this.getValidStatusTransitions(currentRoom.status)
    if (!validTransitions.includes(status)) {
      if (status !== 'maintenance' && status !== 'blocked') {
      throw new Error(`Invalid status transition from ${currentRoom.status} to ${status}`)
      }
    }

    // Check if room can be updated; if occupied, only allow maintenance (soft override)
    if (currentRoom.status === "occupied" && status !== 'maintenance') {
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("id, booking_rooms(room_id), guest:guests(name)")
        .in("status", ["checked_in"]) as any

      if (activeBookings && activeBookings.length > 0) {
        const guestName = (activeBookings[0] as any)?.guest?.name || "Guest"
        throw new Error(`Cannot change status of Room ${currentRoom.number} - it has an active guest (${guestName})`)
      }
    }

    // Update room status
    let { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", roomId)
      .select()
      .single()

    // If database constraint doesn't allow 'maintenance', gracefully fallback to 'blocked'
    if (updateError) {
      const code = (updateError as any)?.code
      const msg = (updateError as any)?.message || ''
      if (status === 'maintenance' && (code === '23514' || msg.includes('rooms_status_check'))) {
        const fallback = await supabase
          .from('rooms')
          .update({ status: 'blocked', updated_at: new Date().toISOString() })
          .eq('id', roomId)
          .select()
          .single()
        if (fallback.error) throw fallback.error
        updatedRoom = fallback.data as any
      } else {
        throw updateError
      }
    }

    // Create housekeeping task if status requires it
    if (status === "cleaning" || status === "maintenance") {
      const taskNumber = `HK${Date.now().toString().slice(-8)}`
      const taskType = status === "cleaning" ? "Room Cleaning" : "Maintenance"
      const priority = status === "cleaning" ? "high" : "medium"
      const estimatedTime = status === "cleaning" ? 45 : 120

      try {
        await supabase
          .from("housekeeping_tasks")
          .insert({
            task_number: taskNumber,
            hotel_id: "550e8400-e29b-41d4-a716-446655440000",
            room_id: roomId,
            type: taskType,
            status: "pending",
            priority,
            estimated_time: estimatedTime,
            notes: reason || `Room status changed to ${status}`,
            assigned_to: assignedStaffId || null
          })
      } catch (taskError) {
        console.warn("Failed to create housekeeping task:", taskError)
      }
    }

    // Log the status change
    try {
      await supabase
        .from("staff_logs")
        .insert({
          hotel_id: "550e8400-e29b-41d4-a716-446655440000",
          staff_id: assignedStaffId || "system",
          action: "room_status_change",
          details: `Room ${currentRoom.number} status changed from ${currentRoom.status} to ${status}. Reason: ${reason || "Not specified"}`
        })
    } catch (logError) {
      console.warn("Failed to log room status change:", logError)
    }

    return updatedRoom as Room
  },

  // Get valid status transitions for a given room status
  getValidStatusTransitions(currentStatus: string) {
    const transitions: Record<string, string[]> = {
      available: ["occupied", "blocked", "maintenance", "cleaning"],
      occupied: ["unclean", "available", "maintenance"],
      unclean: ["cleaning", "maintenance", "available"],
      cleaning: ["available", "maintenance"],
      maintenance: ["available", "blocked"],
      blocked: ["available", "maintenance"],
      reserved: ["blocked", "maintenance", "available"],
      dirty: ["cleaning", "available", "maintenance"],
      vacant: ["occupied", "blocked", "maintenance", "cleaning"]
    }

    return transitions[currentStatus] || ["available"]
  },

  // Complete housekeeping task and update room status
  async completeHousekeepingTask(taskId: string, staffId: string, finalStatus: string = "available", completionNotes?: string) {
    // Validate final status
    const validFinalStatuses = ["available", "maintenance", "blocked"]
    if (!validFinalStatuses.includes(finalStatus)) {
      throw new Error(`Invalid final status: ${finalStatus}. Must be one of: ${validFinalStatuses.join(", ")}`)
    }

    // Get task details including room info
    const { data: task, error: taskFetchError } = await supabase
      .from("housekeeping_tasks")
      .select("*")
      .eq("id", taskId)
      .single()

    if (taskFetchError) throw taskFetchError

    // Update housekeeping task
    const { data: updatedTask, error: taskError } = await supabase
      .from("housekeeping_tasks")
      .update({
        status: "completed",
        notes: completionNotes || "Task completed successfully",
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .select()
      .single()

    if (taskError) throw taskError

    // Update room status
    const { data: updatedRoom, error: roomError } = await supabase
      .from("rooms")
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", task.room_id)
      .select()
      .single()

    if (roomError) throw roomError

    // Log the completion
    try {
      await supabase
        .from("staff_logs")
        .insert({
          hotel_id: "550e8400-e29b-41d4-a716-446655440000",
          staff_id: staffId,
          action: "housekeeping_completed",
          details: `Housekeeping task completed for Room ${updatedRoom.number}. Room status set to ${finalStatus}`
        })
    } catch (logError) {
      console.warn("Failed to log housekeeping completion:", logError)
    }

    return {
      task: updatedTask,
      room: updatedRoom
    }
  },

  // Get room status history
  async getRoomStatusHistory(roomId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from("staff_logs")
      .select("*")
      .eq("room_id", roomId)
      .or("action.eq.room_status_change,action.eq.housekeeping_completed,action.eq.checkout")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  // Get rooms by status with additional information
  async getRoomsByStatusWithDetails(status: string) {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        bookings!inner(
          id,
          status,
          guest:guests(name),
          check_in,
          check_out
        )
      `)
      .eq("status", status)
      .order("number")

    if (error) throw error
    return data
  },

  // Bulk room status update (for maintenance, cleaning schedules, etc.)
  async bulkUpdateRoomStatus(roomIds: string[], newStatus: string, reason?: string, assignedStaffId?: string) {
    const results = []
    const errors = []

    for (const roomId of roomIds) {
      try {
        const result = await this.updateRoomStatus(roomId, newStatus, reason, assignedStaffId)
        results.push(result)
      } catch (error) {
        errors.push({ roomId, error: error instanceof Error ? error.message : String(error) })
      }
    }

    return {
      success: results,
      errors,
      totalProcessed: roomIds.length,
      successCount: results.length,
      errorCount: errors.length
    }
  },

  async getRoomBookings(roomId: string) {
    try {
      console.log("Supabase query: fetching bookings for room", roomId)
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          guest:guests(name, email, phone),
          staff:staff_id(name),
          room:rooms(number, type)
        `)
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })

      console.log("Supabase response:", { data, error })

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("getRoomBookings error:", error)
      throw error
    }
  },

  async getRoomHistory(roomId: string) {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        guest:guests(name, email, phone),
        staff:staff_id(name),
        room:rooms(number, type)
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  async getRoomOccupancyStats(roomId: string, startDate?: Date, endDate?: Date) {
    let query = supabase
      .from("bookings")
      .select("check_in, expected_checkout, status, payment_breakdown:booking_payment_breakdown(total_amount)")
      .eq("room_id", roomId)

    if (startDate && endDate) {
      query = query
        .gte("check_in", startDate.toISOString().split('T')[0])
        .lte("check_out", endDate.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      totalBookings: data.length,
      totalRevenue: data.reduce((sum, booking) => sum + (booking.payment_breakdown?.[0]?.total_amount || 0), 0),
      averageStay: data.length > 0 ?
        data.reduce((sum, booking) => {
          const checkIn = new Date(booking.check_in)
          const checkOut = new Date(booking.expected_checkout)
          return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        }, 0) / data.length : 0,
      occupancyRate: 0, // Would need total days calculation
      completedBookings: data.filter(b => b.status === "checked-out").length,
      cancelledBookings: data.filter(b => b.status === "cancelled").length
    }

    return stats
  },

  async checkIn(bookingId: string, actualCheckInDate?: Date) {
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("check_in, room_id")
      .eq("id", bookingId)
      .single()

    if (fetchError) throw fetchError

    const scheduledCheckIn = new Date(booking.check_in)
    const actualCheckIn = actualCheckInDate || new Date()

    // Check if check-in date matches or ask for confirmation
    if (scheduledCheckIn.toDateString() !== actualCheckIn.toDateString()) {
      throw new Error(`Check-in date mismatch. Scheduled: ${scheduledCheckIn.toDateString()}, Actual: ${actualCheckIn.toDateString()}`)
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "checked-in" })
      .eq("id", bookingId)

    if (updateError) throw updateError

    // Update room status to occupied
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", booking.room_id)

    if (roomError) throw roomError

    return true
  },
}

export const staffService = {
  async getStaff() {
    const { data, error } = await supabase.from("staff").select("*").order("name")

    if (error) throw error
    return data as Staff[]
  },

  async createStaff(staffData: {
    name: string
    email: string
    phone: string
    role: string
    department: string
    permissions: string[]
  }) {
    const hotelId = await getHotelId()
    const { data, error } = await supabase
      .from("staff")
      .insert({
        hotel_id: hotelId,
        name: staffData.name,
        email: staffData.email,
        phone: staffData.phone,
        role: staffData.role,
        department: staffData.department,
        status: "active",
        join_date: new Date().toISOString().split('T')[0],
        permissions: staffData.permissions
      })
      .select()
      .single()

    if (error) throw error
    return data as Staff
  },

  async updateStaff(id: string, staffData: Partial<Staff>) {
    const { data, error } = await supabase
      .from("staff")
      .update({
        ...staffData,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as Staff
  },

  async deleteStaff(id: string) {
    // Check if staff has any active bookings
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id, booking_number")
      .eq("staff_id", id)
      .in("status", ["confirmed", "checked-in"])
      .limit(1)

    if (activeBookings && activeBookings.length > 0) {
      throw new Error(`Cannot delete staff member - they have active bookings (e.g., ${activeBookings[0].booking_number})`)
    }

    // Check if staff has any assigned tasks
    const { data: assignedTasks } = await supabase
      .from("housekeeping_tasks")
      .select("id, task_number")
      .eq("assigned_to", id)
      .in("status", ["pending", "in-progress"])
      .limit(1)

    if (assignedTasks && assignedTasks.length > 0) {
      throw new Error(`Cannot delete staff member - they have assigned tasks (e.g., ${assignedTasks[0].task_number})`)
    }

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", id)

    if (error) throw error
    return true
  },

  async getStaffLogs() {
    const { data, error } = await supabase
      .from("staff_logs")
      .select(`
        *,
        staff:staff_id(name)
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error
    return data as StaffLog[]
  },

  async logStaffAction(staffId: string, action: string, details: string) {
    const { error } = await supabase
      .from("staff_logs")
      .insert({
        hotel_id: "550e8400-e29b-41d4-a716-446655440000",
        staff_id: staffId,
        action,
        details,
        ip_address: "192.168.1.100" // In a real app, this would come from the request
      })

    if (error) throw error
    return true
  }
}

// Tax calculation utilities
export const calculateTaxes = (baseAmount: number, taxRates: {
  gst?: number
  cgst?: number
  sgst?: number
  luxuryTax?: number
  serviceCharge?: number
}) => {
  const {
    gst = 0,
    cgst = 0,
    sgst = 0,
    luxuryTax = 0,
    serviceCharge = 0
  } = taxRates

  const gstAmount = (baseAmount * gst) / 100
  const cgstAmount = (baseAmount * cgst) / 100
  const sgstAmount = (baseAmount * sgst) / 100
  const luxuryTaxAmount = (baseAmount * luxuryTax) / 100
  const serviceChargeAmount = (baseAmount * serviceCharge) / 100

  const totalTax = gstAmount + cgstAmount + sgstAmount + luxuryTaxAmount + serviceChargeAmount
  const grandTotal = baseAmount + totalTax
  return {
    baseAmount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    luxuryTaxAmount,
    serviceChargeAmount,
    totalTax,
    grandTotal,
    breakdown: {
      gst: { rate: gst, amount: gstAmount },
      cgst: { rate: cgst, amount: cgstAmount },
      sgst: { rate: sgst, amount: sgstAmount },
      luxuryTax: { rate: luxuryTax, amount: luxuryTaxAmount },
      serviceCharge: { rate: serviceCharge, amount: serviceChargeAmount }
    }
  }
}

// Default tax rates (can be configured per hotel)
export const DEFAULT_TAX_RATES = {
  gst: 12, // 12% GST
  cgst: 6, // 6% CGST
  sgst: 6, // 6% SGST
  luxuryTax: 5, // 5% Luxury Tax
  serviceCharge: 10 // 10% Service Charge
}

// Tax Type Service
export const taxTypeService = {
  async getTaxTypes(): Promise<TaxType[]> {
    const { data, error } = await supabase
      .from("tax_types")
      .select("*")
      .eq("is_active", true)
      .order("name")

    if (error) throw error
    return data as TaxType[]
  },

  async getTaxRates(): Promise<Record<string, number>> {
    const taxTypes = await this.getTaxTypes()
    const rates: Record<string, number> = {}

    taxTypes.forEach(tax => {
      const key = tax.name.toLowerCase().replace(/\s+/g, '')
      rates[key] = tax.rate
    })

    return rates
  },

  async calculateBookingTaxes(bookingId: string): Promise<void> {
    const { error } = await supabase.rpc('calculate_booking_taxes', {
      p_booking_id: bookingId
    })

    if (error) throw error
  }
}

export const bookingService = {
  /**
   * Backfill existing bookings to have correct taxed total_amount values
   * This fixes existing bookings that have base amounts instead of taxed totals
   */
  async backfillBookingTotals() {
    try {
      console.log('Starting backfill of booking totals...')

      // Get all bookings that need backfilling (where total_amount != taxed_total_amount or taxed_total_amount is 0)
      const { data: bookings, error: fetchError } = await supabase
        .from('booking_payment_breakdown')
        .select(`
          booking_id,
          total_amount,
          taxed_total_amount,
          total_tax_amount
        `)
        .or('taxed_total_amount.is.null,taxed_total_amount.eq.0')

      if (fetchError) {
        console.error('Error fetching bookings for backfill:', fetchError)
        return { success: false, error: fetchError.message }
      }

      if (!bookings || bookings.length === 0) {
        console.log('No bookings need backfilling')
        return { success: true, message: 'No bookings need backfilling' }
      }

      console.log(`Found ${bookings.length} bookings to backfill`)

      // Get tax rates
      const { data: taxTypes } = await supabase
        .from('tax_types')
        .select('id, name, rate')
        .eq('is_active', true)

      const taxRates = {
        gst: taxTypes?.find(t => t.name === 'GST')?.rate || 12,
        cgst: taxTypes?.find(t => t.name === 'CGST')?.rate || 6,
        sgst: taxTypes?.find(t => t.name === 'SGST')?.rate || 6,
        luxuryTax: taxTypes?.find(t => t.name === 'Luxury Tax')?.rate || 5,
        serviceCharge: taxTypes?.find(t => t.name === 'Service Charge')?.rate || 10
      }

      const taxIds = {
        gst: taxTypes?.find(t => t.name === 'GST')?.id,
        cgst: taxTypes?.find(t => t.name === 'CGST')?.id,
        sgst: taxTypes?.find(t => t.name === 'SGST')?.id,
        luxuryTax: taxTypes?.find(t => t.name === 'Luxury Tax')?.id,
        serviceCharge: taxTypes?.find(t => t.name === 'Service Charge')?.id
      }

      let successCount = 0
      let errorCount = 0

      // Process each booking
      for (const booking of bookings) {
        try {
          const baseAmount = Number(booking.total_amount || 0)

          if (baseAmount > 0) {
            // Calculate taxes
            const gstAmount = (baseAmount * taxRates.gst) / 100
            const cgstAmount = (baseAmount * taxRates.cgst) / 100
            const sgstAmount = (baseAmount * taxRates.sgst) / 100
            const luxuryTaxAmount = (baseAmount * taxRates.luxuryTax) / 100
            const serviceChargeAmount = (baseAmount * taxRates.serviceCharge) / 100

            const totalTaxAmount = gstAmount + cgstAmount + sgstAmount + luxuryTaxAmount + serviceChargeAmount
            const taxedTotalAmount = baseAmount + totalTaxAmount

            // Update the booking_payment_breakdown
            const { error: updateError } = await supabase
              .from('booking_payment_breakdown')
              .update({
                gst_tax_type_id: taxIds.gst,
                cgst_tax_type_id: taxIds.cgst,
                sgst_tax_type_id: taxIds.sgst,
                luxury_tax_type_id: taxIds.luxuryTax,
                service_charge_tax_type_id: taxIds.serviceCharge,
                gst_amount: gstAmount,
                cgst_amount: cgstAmount,
                sgst_amount: sgstAmount,
                luxury_tax_amount: luxuryTaxAmount,
                service_charge_amount: serviceChargeAmount,
                total_tax_amount: totalTaxAmount,
                taxed_total_amount: taxedTotalAmount,
                total_amount: taxedTotalAmount, // Set total_amount to grand total
                outstanding_amount: taxedTotalAmount, // Will be recalculated when advances are processed
                updated_at: new Date().toISOString()
              })
              .eq('booking_id', booking.booking_id)

            if (updateError) {
              console.error(`Error updating booking ${booking.booking_id}:`, updateError)
              errorCount++
            } else {
              console.log(`Updated booking ${booking.booking_id}: ${baseAmount} → ${taxedTotalAmount}`)
              successCount++
            }
          }
        } catch (bookingError) {
          console.error(`Error processing booking ${booking.booking_id}:`, bookingError)
          errorCount++
        }
      }

      console.log(`Backfill completed: ${successCount} successful, ${errorCount} errors`)
      return {
        success: true,
        message: `Backfilled ${successCount} bookings successfully, ${errorCount} errors`
      }

    } catch (error: any) {
      console.error('Backfill failed:', error)
      return { success: false, error: error.message }
    }
  },

  // ... existing methods
  // async checkOut(
  //   bookingId: string,
  //   actualCheckOutDate: Date,
  //   checkoutDetails: {
  //     earlyCheckoutReason?: string,
  //     priceAdjustment: number,
  //     finalAmount: number,
  //     adjustmentReason: string,
  //     remainingBalance?: number,
  //     remainingBalanceCollectedBy?: string,
  //     remainingBalancePaymentMethod?: string,
  //     checkoutNotes?: string
  //   }
  // ) {
  //   try {
  //     console.log(`Processing checkout for booking ${bookingId} with actualCheckOutDate:`, actualCheckOutDate);

  //     // Get the existing booking
  //     const booking = await this.getBookingById(bookingId);
  //     if (!booking) {
  //       throw new Error(`Booking with ID ${bookingId} not found`);
  //     }

  //     const checkoutPayload = {
  //       status: "checked_out",
  //       actual_check_out: actualCheckOutDate.toISOString(),
  //       price_adjustment: checkoutDetails.priceAdjustment,
  //       final_amount: checkoutDetails.finalAmount,
  //       checkout_notes: checkoutDetails.checkoutNotes || JSON.stringify({
  //         adjustmentReason: checkoutDetails.adjustmentReason,
  //         earlyCheckoutReason: checkoutDetails.earlyCheckoutReason || null,
  //         remainingBalance: checkoutDetails.remainingBalance || null,
  //         remainingBalanceCollectedBy: checkoutDetails.remainingBalanceCollectedBy || null,
  //         remainingBalancePaymentMethod: checkoutDetails.remainingBalancePaymentMethod || null,
  //         checkoutProcessed: new Date().toISOString(),
  //       }),
  //     };

  //     // Update the booking in the database
  //     const { data, error } = await supabase
  //       .from("bookings")
  //       .update(checkoutPayload)
  //       .eq("id", bookingId)
  //       .select()
  //       .single();

  //     if (error) {
  //       console.error(`Error during checkout for booking ${bookingId}:`, error);
  //       throw error;
  //     }

  //     // Update room status to available
  //     await supabase
  //       .from("rooms")
  //       .update({ status: "available" })
  //       .eq("id", booking.room_id);

  //     // Create housekeeping task
  //     await supabase.from("housekeeping_tasks").insert({
  //       room_id: booking.room_id,
  //       task_type: "checkout_cleaning",
  //       status: "pending",
  //       notes: `Room needs cleaning after checkout. Booking: ${booking.booking_number}`,
  //       priority: "high",
  //       assigned_to: null, // Will be assigned by housekeeping manager
  //       created_at: new Date().toISOString(),
  //       due_by: new Date(new Date().getTime() + 3600000).toISOString(), // 1 hour from now
  //     });

  //     // Log the action
  //     await supabase.from("staff_logs").insert({
  //       staff_id: booking.staff_id,
  //       action: "checkout",
  //       details: JSON.stringify({
  //         booking_id: bookingId,
  //         booking_number: booking.booking_number,
  //         guest_name: booking.guest?.name,
  //         room_number: booking.room?.number,
  //         scheduled_checkout: booking.check_out,
  //         actual_checkout: actualCheckOutDate.toISOString(),
  //         price_adjustment: checkoutDetails.priceAdjustment,
  //         final_amount: checkoutDetails.finalAmount,
  //         adjustment_reason: checkoutDetails.adjustmentReason
  //       }),
  //       ip_address: "192.168.1.100" // In a real app, this would come from the request
  //     });

  //     // Calculate the checkout result
  //     const scheduledCheckOut = new Date(booking.check_out);
  //     const checkInDate = new Date(booking.check_in);
  //     const scheduledDays = Math.ceil((scheduledCheckOut.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  //     const actualDays = Math.ceil((actualCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  //     const daysDifference = scheduledDays - actualDays;

  //     return {
  //       success: true,
  //       booking: data,
  //       priceAdjustment: checkoutDetails.priceAdjustment,
  //       finalAmount: checkoutDetails.finalAmount,
  //       adjustmentReason: checkoutDetails.adjustmentReason,
  //       isEarlyCheckout: daysDifference > 0,
  //       isLateCheckout: daysDifference < 0,
  //       daysDifference
  //     };
  //   } catch (error) {
  //     console.error("Error in checkout process:", error);
  //     return {
  //       success: false,
  //       error: (error as Error).message || "Unknown error during checkout"
  //     };
  //   }
  // },

  async getBookings() {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          guest:guest_id(name, email, phone, first_name, last_name, address),
          staff:staff_id(name),
          payment_breakdown:booking_payment_breakdown(*),
          charge_items(id, product_id, quantity, rate, total_amount, cgst_amount, sgst_amount, product:product_id(name, category)),
          booking_rooms(
            *,
            room:room_id(
              id,
              number,
              room_type:room_type_id(name, code, base_price)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all bookings:", error);
        throw error;
      }

      // Process the data to add helper properties for backward compatibility
      const processedData = data?.map(booking => {
        const processedBooking = { ...booking } as Booking;

        // Add helper properties from booking_rooms
        if (booking.booking_rooms && booking.booking_rooms.length > 0) {
          const primaryRoom = booking.booking_rooms[0];

          // Set primary room info for backward compatibility
          processedBooking.room = primaryRoom.room;
          processedBooking.room_status = primaryRoom.room_status;

          // Calculate total amount from all rooms
          const totalAmount = booking.booking_rooms.reduce((sum: number, room: any) =>
            sum + (room.room_total || 0), 0
          );
          // total_amount is now in payment_breakdown, not in the main booking
          if (!processedBooking.payment_breakdown) {
            processedBooking.payment_breakdown = { total_amount: totalAmount } as any;
          } else {
            processedBooking.payment_breakdown.total_amount = totalAmount;
          }

          // Update check-in/check-out dates from primary room
          processedBooking.check_in = primaryRoom.check_in_date;
          processedBooking.expected_checkout = primaryRoom.check_out_date;
          processedBooking.actual_check_in = primaryRoom.actual_check_in;
          processedBooking.actual_check_out = primaryRoom.actual_check_out;
        }

        return processedBooking;
      }) || [];

      // Log the number of bookings found
      console.log(`Found ${processedData.length} total bookings`);

      return processedData as Booking[];
    } catch (error) {
      console.error("Error in getBookings:", error);
      return [] as Booking[]; // Return empty array to prevent UI breaks
    }
  },

  async getActiveStayByRoom(roomId: string) {
    // Fetch the most relevant booking for this room (checked_in first, then confirmed/pending)
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        guest:guest_id(name, email, phone, address, first_name, last_name),
        staff:staff_id(id, name),
        payment_breakdown:booking_payment_breakdown(*),
        charge_items(id, product_id, quantity, rate, total_amount, cgst_amount, sgst_amount, product:product_id(name, category)),
        booking_rooms!inner(
          id,
          room_id,
          room_status,
          check_in_date,
          check_out_date,
          actual_check_in,
          actual_check_out,
          room_rate,
          room_total,
          room:room_id(id, number, status, room_type:room_type_id(name, code, base_price))
        )
      `)
      .eq("booking_rooms.room_id", roomId)
      .eq("status", "checked_in") // Only show actively checked-in bookings
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw error
    return (data && data.length > 0) ? data[0] : null
  },

  async getCheckinInfoByRoom(roomId: string) {
    // Compose check-in info: active stay + recent payment transactions
    const booking = await this.getActiveStayByRoom(roomId)
    if (!booking) return { booking: null, transactions: [] as any[] }

    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.warn('Failed to load payment transactions:', error)
      return { booking, transactions: [] as any[] }
    }

    return { booking, transactions: transactions || [] }
  },

  async getCheckInReadyBookings() {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          guest:guest_id(name, email, phone, id_type, id_number, first_name, last_name, address),
          staff:staff_id(id, name),
          payment_breakdown:booking_payment_breakdown(*),
          booking_rooms(
            *,
            room:room_id(
              id,
              number,
              status,
              room_type:room_type_id(name, code, base_price)
            )
          )
        `)
        .in("status", ["confirmed", "pending"])
        .lte("check_in", new Date().toISOString().split('T')[0]) // Check-in date is today or earlier
        .order("check_in", { ascending: true });

      if (error) {
        console.error("Error fetching check-in ready bookings:", error);
        throw error;
      }

      // Process the data to add helper properties for backward compatibility
      const processedData = data?.map(booking => {
        const processedBooking = { ...booking } as Booking;

        // Add helper properties from booking_rooms
        if (booking.booking_rooms && booking.booking_rooms.length > 0) {
          const primaryRoom = booking.booking_rooms[0];

          // Set primary room info for backward compatibility
          processedBooking.room = primaryRoom.room;
          processedBooking.room_status = primaryRoom.room_status;

          // Calculate total amount from all rooms
          const totalAmount = booking.booking_rooms.reduce((sum: number, room: any) =>
            sum + (room.room_total || 0), 0
          );
          // total_amount is now in payment_breakdown, not in the main booking
          if (!processedBooking.payment_breakdown) {
            processedBooking.payment_breakdown = { total_amount: totalAmount } as any;
          } else {
            processedBooking.payment_breakdown.total_amount = totalAmount;
          }

          // Update check-in/check-out dates from primary room
          processedBooking.check_in = primaryRoom.check_in_date;
          processedBooking.expected_checkout = primaryRoom.check_out_date;
          processedBooking.actual_check_in = primaryRoom.actual_check_in;
          processedBooking.actual_check_out = primaryRoom.actual_check_out;
        }

        return processedBooking;
      }) || [];

      return processedData as Booking[];
    } catch (error) {
      console.error("Error in getCheckInReadyBookings:", error);
      return [] as Booking[]; // Return empty array to prevent UI breaks
    }
  },

  async getBookingById(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          guest:guest_id(
            name, 
            email, 
            phone, 
            first_name, 
            last_name, 
            address, 
            nationality
          ),
          staff:staff_id(name),
          payment_breakdown:booking_payment_breakdown(*),
          charge_items(id, product_id, quantity, rate, total_amount, cgst_amount, sgst_amount, product:product_id(name, category)),
          booking_rooms(
            *,
            room:room_id(
              id,
              number,
              room_type:room_type_id(name, code, base_price)
            )
          )
        `)
        .eq("id", bookingId)
        .single()

      if (error) {
        console.error(`Error fetching booking ID ${bookingId}:`, error);
        throw error;
      }

      // Process the data to add helper properties for backward compatibility
      const processedBooking = { ...data } as Booking;

      // Add helper properties from booking_rooms
      if (data.booking_rooms && data.booking_rooms.length > 0) {
        const primaryRoom = data.booking_rooms[0];

        // Set primary room info for backward compatibility
        processedBooking.room = primaryRoom.room;
        processedBooking.room_status = primaryRoom.room_status;

        // Calculate total amount from all rooms
        const totalAmount = data.booking_rooms.reduce((sum: number, room: any) =>
          sum + (room.room_total || 0), 0
        );
        // total_amount is now in payment_breakdown, not in the main booking
        if (!processedBooking.payment_breakdown) {
          processedBooking.payment_breakdown = { total_amount: totalAmount } as any;
        } else {
          processedBooking.payment_breakdown.total_amount = totalAmount;
        }

        // Update check-in/check-out dates from primary room
        processedBooking.check_in = primaryRoom.check_in_date;
        processedBooking.expected_checkout = primaryRoom.check_out_date;
        processedBooking.actual_check_in = primaryRoom.actual_check_in;
        processedBooking.actual_check_out = primaryRoom.actual_check_out;
      }

      // Normalize address structure if needed
      if (processedBooking.guest && typeof processedBooking.guest === 'object') {
        // Fix address if it's a string or undefined
        if (!processedBooking.guest.address || typeof processedBooking.guest.address !== 'object' ||
          !processedBooking.guest.address.street_address) {
          console.log(`Normalizing address format for guest in booking ${bookingId}`);

          const originalAddress = typeof processedBooking.guest.address === 'string'
            ? processedBooking.guest.address
            : "";

          processedBooking.guest.address = {
            street_address: originalAddress,
            city: "PUDUCHERRY",
            postal_code: "605003",
            state: "Tamil Nadu",
            country: "India"
          };
        }
      }

      return processedBooking as Booking;
    } catch (error) {
      console.error(`Error in getBookingById for booking ${bookingId}:`, error);
      throw error;
    }
  }, async getBookingsByRoomId(roomId: string) {
    try {
      console.log(`Fetching bookings for room ID: ${roomId}`);
      const { data, error } = await supabase
        .from("booking_rooms")
        .select(`
          *,
          booking:booking_id(
            *,
            guest:guest_id(
              id,
              name, 
              email, 
              phone, 
              first_name, 
              last_name, 
              address,
              nationality
            ),
            staff:staff_id(name)
          ),
          room:room_id(
            number,
            room_type:room_type_id(name, code, base_price)
          )
        `)
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(`Supabase error fetching bookings for room ${roomId}:`, error);
        throw error;
      }

      // Log the data for debugging
      console.log(`Found ${data?.length || 0} booking_rooms for room ${roomId}`);

      // Transform the data to match the expected Booking[] format
      const bookings = data?.map(br => ({
        ...br.booking,
        booking_rooms: [br],
        room: br.room
      })) || [];

      // Check and normalize address structure if needed
      if (bookings && Array.isArray(bookings)) {
        bookings.forEach(booking => {
          if (booking.guest && typeof booking.guest === 'object') {
            // Fix address if it's a string, null, undefined or not properly structured
            if (!booking.guest.address || typeof booking.guest.address !== 'object' ||
              !booking.guest.address.street_address) {
              console.log(`Normalizing address format for guest: ${booking.guest.id}`);

              // Preserve the original address string if it exists
              const originalAddress = typeof booking.guest.address === 'string'
                ? booking.guest.address
                : "";

              booking.guest.address = {
                street_address: originalAddress,
                city: "PUDUCHERRY",
                postal_code: "605003",
                state: "Tamil Nadu",
                country: "India"
              };
            }
          }
        });
      }

      return bookings as Booking[];
    } catch (error) {
      console.error(`Error in getBookingsByRoomId for room ${roomId}:`, error);

      // Return empty array instead of throwing to prevent UI breaks
      return [];
    }
  },
  async getGuestBookingStats(guestId: string) {
    try {
      const { data: bookings } = await (supabase
        .from('bookings')
        .select(`id, guest_id, created_at, meal_plan, booking_rooms(expected_nights), payment_breakdown:booking_payment_breakdown(total_amount)`)
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false })) as any

      let totalNights = 0
      let totalSpent = 0
      let mealPlan: string | undefined = undefined
        ; (bookings || []).forEach((b: any) => {
          const rooms = Array.isArray(b.booking_rooms) ? b.booking_rooms : []
          rooms.forEach((br: any) => {
            totalNights += Number(br.expected_nights || 0)
          })
          totalSpent += Number(b.payment_breakdown?.total_amount || 0)
          if (mealPlan === undefined && b.meal_plan) mealPlan = b.meal_plan
        })
      return { totalStays: totalNights, totalSpent, mealPlan }
    } catch (e) {
      console.warn('Failed to compute guest stats:', e)
      return { totalStays: 0, totalSpent: 0, mealPlan: undefined }
    }
  },

  async checkRoomAvailability(roomId: string, checkInDate: Date, checkOutDate: Date, excludeBookingId?: string) {
    // Get all booking_rooms for this room
    let query = supabase
      .from("booking_rooms")
      .select("check_in_date, check_out_date, room_status, booking_id")
      .eq("room_id", roomId)
      .in("room_status", ["reserved", "checked_in"])

    // Exclude current booking if editing
    if (excludeBookingId) {
      query = query.neq("booking_id", excludeBookingId)
    }

    const { data: existingBookingRooms, error } = await query

    if (error) throw error

    // Check for date overlaps
    for (const bookingRoom of existingBookingRooms) {
      const existingCheckIn = new Date(bookingRoom.check_in_date)
      const existingCheckOut = new Date(bookingRoom.check_out_date)

      // Check if both bookings are on the same day
      const isSameDayBooking = checkInDate.toDateString() === checkOutDate.toDateString()
      const isExistingSameDay = existingCheckIn.toDateString() === existingCheckOut.toDateString()
      const sameDate = checkInDate.toDateString() === existingCheckIn.toDateString()

      if (isSameDayBooking && isExistingSameDay && sameDate) {
        // Same-day booking conflict - for now, prevent all same-day overlaps
        // Future enhancement: check time overlap using expected_check_in_time and expected_check_out_time
        return {
          available: false,
          conflictingBooking: bookingRoom,
          message: `Room has same-day booking conflict`
        }
      } else if (doDatesOverlap(checkInDate, checkOutDate, existingCheckIn, existingCheckOut)) {
        return {
          available: false,
          conflictingBooking: bookingRoom,
          message: `Room is already booked from ${formatDateForDatabase(existingCheckIn)} to ${formatDateForDatabase(existingCheckOut)}`
        }
      }
    }

    return { available: true }
  },

  async createBooking(bookingData: {
    guestName: string
    guestPhone: string
    guestEmail: string
    roomId: string
    staffId: string
    checkInDate: Date
    checkOutDate: Date
    checkInTime?: string
    checkOutTime?: string
    totalAmount: number
    advanceAmount: number
    specialRequests?: string
    taxRates?: typeof DEFAULT_TAX_RATES
    number_of_guests?: number
    child_guests?: number
    extra_guests?: number
    meal_plan?: 'CP' | 'MAP' | 'EP'
    plan_name?: string
    purpose?: string
    ota_company?: string
    arrival_type?: 'walk_in' | 'phone' | 'online' | 'OTA' | 'agent' | 'corporate'
  }) {
    try {
      // Compute nights and room rate from room_type.base_price to snapshot pricing
      const nights = Math.max(
        1,
        Math.ceil(
          (bookingData.checkOutDate.getTime() - bookingData.checkInDate.getTime()) /
          (1000 * 60 * 60 * 24)
        )
      )

      const { data: roomForRate, error: roomForRateErr } = await supabase
        .from('rooms')
        .select('id, room_type:room_type_id(base_price)')
        .eq('id', bookingData.roomId)
        .single()

      if (roomForRateErr || !roomForRate) {
        throw new Error('Failed to fetch room rate')
      }
      const roomRate = Number((roomForRate as any)?.room_type?.base_price || 0)
      const roomTotal = roomRate * nights

      // Get hotel ID from room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("hotel_id")
        .eq("id", bookingData.roomId)
        .single()

      if (roomError || !roomData) {
        throw new Error("Room not found")
      }

      // Create new guest for each booking (don't reuse existing guests)
      // This ensures each booking has its own guest record, even with same phone number
        const { data: newGuest, error: guestError } = await supabase
          .from("guests")
          .insert({
            name: bookingData.guestName,
            email: bookingData.guestEmail,
          phone: bookingData.guestPhone,
          status: 'active',
          guest_category: 'regular',
          loyalty_points: 0,
          total_stays: 0,
          total_spent: 0
          })
          .select()
          .single()

        if (guestError || !newGuest) {
          throw new Error("Failed to create guest")
        }
      const guestId = newGuest.id

      // Create loyalty record for new guest
      try {
        await supabase
          .from('guest_loyalty')
          .insert({
            guest_id: guestId,
            tier: 'bronze',
            points_earned: 0,
            points_redeemed: 0,
            points_expired: 0
          })
      } catch (loyaltyError) {
        console.warn('Failed to create loyalty record:', loyaltyError)
        // Don't fail the booking if loyalty creation fails
      }

      // Generate booking number
      const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`

      // Create booking
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          booking_number: bookingNumber,
          hotel_id: roomData.hotel_id,
          guest_id: guestId,
          staff_id: bookingData.staffId,
          check_in: formatDateForDatabase(bookingData.checkInDate),
          expected_checkout: formatDateForDatabase(bookingData.checkOutDate),
          arrival_type: bookingData.arrival_type || 'walk_in',
          special_requests: bookingData.specialRequests || "",
          status: "confirmed",
          number_of_guests: bookingData.number_of_guests || 1,
          child_guests: bookingData.child_guests || 0,
          extra_guests: bookingData.extra_guests || 0,
          meal_plan: bookingData.meal_plan || 'EP',
          plan_name: bookingData.plan_name || 'STD',
          purpose: bookingData.purpose,
          ota_company: bookingData.ota_company,
          booked_on: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error("Booking creation error:", error)
        throw new Error(`Error creating booking: ${error.message}`)
      }

      // Create booking_room entry with pricing snapshot
      const isSameDayBooking = bookingData.checkInDate.toDateString() === bookingData.checkOutDate.toDateString()
      
      const { data: bookingRoom, error: bookingRoomError } = await supabase
        .from("booking_rooms")
        .insert({
          booking_id: booking.id,
          room_id: bookingData.roomId,
          check_in_date: formatDateForDatabase(bookingData.checkInDate),
          check_out_date: formatDateForDatabase(bookingData.checkOutDate),
          room_status: 'reserved',
          room_rate: roomRate,
          expected_nights: nights,
          room_total: roomTotal,
          // Add expected times for same-day bookings
          ...(isSameDayBooking && {
            expected_check_in_time: bookingData.checkInTime ? 
              new Date(`${formatDateForDatabase(bookingData.checkInDate)}T${bookingData.checkInTime}:00`).toISOString() : 
              bookingData.checkInDate.toISOString(),
            expected_check_out_time: bookingData.checkOutTime ? 
              new Date(`${formatDateForDatabase(bookingData.checkOutDate)}T${bookingData.checkOutTime}:00`).toISOString() : 
              bookingData.checkOutDate.toISOString()
          })
        })
        .select()
        .single()

      if (bookingRoomError) {
        console.error("Booking room creation error:", bookingRoomError)
        throw new Error(`Error creating booking room: ${bookingRoomError.message}`)
      }

      // CRITICAL: Ensure room status is updated to 'reserved' for the booked room
      // This is a backup mechanism in case the database trigger fails
      try {
        await supabase
          .from('rooms')
          .update({ status: 'reserved' })
          .eq('id', bookingData.roomId)
        
        console.log(`Updated room status to 'reserved' for room: ${bookingData.roomId}`)
      } catch (roomStatusError) {
        console.warn('Failed to update room status manually:', roomStatusError)
        // Don't fail the booking creation if room status update fails
        // The trigger should handle this, but this is a safety net
      }

      // Create payment breakdown entry with the correct total amount
      const { error: breakdownError } = await supabase
        .from("booking_payment_breakdown")
        .upsert({
          booking_id: booking.id,
          total_amount: bookingData.totalAmount,
          outstanding_amount: bookingData.totalAmount
        }, {
          onConflict: 'booking_id'
        })

      if (breakdownError) {
        console.warn("Payment breakdown creation failed:", breakdownError)
      }

      // The bookingData.totalAmount is already the taxed total amount from frontend calculation
      // We just need to store it correctly in the breakdown
      try {
        // Update the breakdown with the correct taxed total amount
        const { error: updateError } = await supabase
          .from('booking_payment_breakdown')
          .update({
            total_amount: bookingData.totalAmount,
            taxed_total_amount: bookingData.totalAmount,
            outstanding_amount: bookingData.totalAmount - bookingData.advanceAmount
          })
          .eq('booking_id', booking.id)

        if (updateError) {
          console.warn('Failed to update payment breakdown with taxed total:', updateError)
        }
      } catch (taxErr) {
        console.error('Failed to update payment breakdown:', taxErr)
      }

      // Record advance payment transaction (if any) and update breakdown advances/outstanding
      if (bookingData.advanceAmount && bookingData.advanceAmount > 0) {
        try {
          await supabase
            .from('payment_transactions')
            .insert({
              booking_id: booking.id,
              amount: bookingData.advanceAmount,
              payment_method: (bookingData as any).paymentMethod || 'cash',
              transaction_type: 'advance',
              collected_by: bookingData.staffId,
              transaction_date: new Date().toISOString(),
              status: 'completed',
            })
        } catch (txErr) {
          console.warn('Failed to insert advance transaction:', txErr)
        }

        try {
          const { data: bpd2 } = await supabase
            .from('booking_payment_breakdown')
            .select('total_amount, total_tax_amount, taxed_total_amount, advance_cash, advance_card, advance_upi, advance_bank')
            .eq('booking_id', booking.id)
            .single()

          // Use taxed_total_amount if available, otherwise total_amount
          const grandTotal = Number(bpd2?.taxed_total_amount || bpd2?.total_amount || 0)

          const method = ((bookingData as any).paymentMethod || 'cash') as 'cash' | 'card' | 'upi' | 'bank'
          const advCash = Number(bpd2?.advance_cash || 0) + (method === 'cash' ? bookingData.advanceAmount : 0)
          const advCard = Number(bpd2?.advance_card || 0) + (method === 'card' ? bookingData.advanceAmount : 0)
          const advUpi = Number(bpd2?.advance_upi || 0) + (method === 'upi' ? bookingData.advanceAmount : 0)
          const advBank = Number(bpd2?.advance_bank || 0) + (method === 'bank' ? bookingData.advanceAmount : 0)
          const advTotal = advCash + advCard + advUpi + advBank

          // Outstanding = Grand Total - Total Advances
          const outstandingAmount = Math.max(0, grandTotal - advTotal)

          await supabase
            .from('booking_payment_breakdown')
            .update({
              advance_cash: advCash,
              advance_card: advCard,
              advance_upi: advUpi,
              advance_bank: advBank,
              outstanding_amount: outstandingAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('booking_id', booking.id)
        } catch (bdErr) {
          console.warn('Failed to update breakdown with advance:', bdErr)
        }
      }

      // Log staff action (optional - don't fail if table doesn't exist)
      try {
        await supabase.from("staff_logs").insert({
          hotel_id: roomData.hotel_id,
          staff_id: bookingData.staffId,
          action: "CREATE_BOOKING",
          details: `Created booking ${bookingNumber} for ${bookingData.guestName} - Room ${bookingData.roomId}`
        })
      } catch (logError) {
        console.warn("Staff log not available:", logError)
      }

      return booking
    } catch (error) {
      console.error("createBooking error:", error)
      throw error
    }
  },

  /**
   * Create a booking with multiple rooms sharing the same check-in/out dates.
   * - Creates/updates primary guest
   * - Inserts booking (no room_id column per new schema)
   * - Bulk inserts into booking_rooms for all provided rooms
   * - Initializes booking_payment_breakdown.total_amount
   * - Records split advance payments via RPC (optional)
   */
  async createBookingWithRooms(bookingData: {
    guestName: string
    guestPhone: string
    guestEmail?: string
    staffId: string
    checkInDate: Date
    checkOutDate: Date
    checkInTime?: string
    checkOutTime?: string
    specialRequests?: string
    number_of_guests?: number
    child_guests?: number
    extra_guests?: number
    meal_plan?: 'CP' | 'MAP' | 'EP'
    plan_name?: string
    purpose?: string
    ota_company?: string
    arrival_type?: 'walk_in' | 'phone' | 'online' | 'OTA' | 'agent' | 'corporate'
    bill_to?: 'guest' | 'company'
    company_id?: string | null
    booking_channel?: 'direct' | 'ota' | 'corporate'
    reserved_status?: 'unconfirmed' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
    check_in_mode?: 'day' | 'night'
    payment_method_pref?: string | null
    gst_number?: string | null
    gst_type?: string | null
    rooms: { id: string }[]
    totalAmount: number
    advancePayments?: { method: 'upi' | 'card' | 'cash' | 'bank'; amount: number }[]
  }) {
    try {
      if (!bookingData.rooms || bookingData.rooms.length === 0) {
        throw new Error('At least one room must be provided')
      }

      // Resolve hotel_id from first room (assumes all rooms belong to same hotel)
      const firstRoomId = bookingData.rooms[0].id
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('hotel_id')
        .eq('id', firstRoomId)
        .single()

      if (roomError || !roomData) throw new Error('Room not found')

      // Create new guest for each booking (don't reuse existing guests)
      // This ensures each booking has its own guest record, even with same phone number
      const { data: newGuest, error: guestError } = await supabase
        .from('guests')
        .insert({
          name: bookingData.guestName,
          email: bookingData.guestEmail,
          phone: bookingData.guestPhone,
          status: 'active',
          guest_category: 'regular',
          loyalty_points: 0,
          total_stays: 0,
          total_spent: 0
        })
        .select()
        .single()

      if (guestError || !newGuest) throw new Error('Failed to create guest')
      const guestId = newGuest.id

      // Create loyalty record for new guest
      try {
        await supabase
          .from('guest_loyalty')
          .insert({
            guest_id: guestId,
            tier: 'bronze',
            points_earned: 0,
            points_redeemed: 0,
            points_expired: 0
          })
      } catch (loyaltyError) {
        console.warn('Failed to create loyalty record:', loyaltyError)
        // Don't fail the booking if loyalty creation fails
      }

      const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`

      // Create booking record
      const { data: booking, error: createBookingError } = await supabase
        .from('bookings')
        .insert({
          booking_number: bookingNumber,
          hotel_id: roomData.hotel_id,
          guest_id: guestId,
          staff_id: bookingData.staffId,
          arrival_type: bookingData.arrival_type || 'walk_in',
          special_requests: bookingData.specialRequests || '',
          status: 'confirmed',
          number_of_guests: bookingData.number_of_guests ?? 1,
          child_guests: bookingData.child_guests ?? 0,
          extra_guests: bookingData.extra_guests ?? 0,
          meal_plan: bookingData.meal_plan || 'EP',
          plan_name: bookingData.plan_name || 'STD',
          purpose: bookingData.purpose,
          ota_company: bookingData.ota_company,
          booked_on: new Date().toISOString(),
          bill_to: (bookingData.bill_to as any) ?? 'guest',
          company_id: bookingData.company_id ?? null,
          booking_channel: (bookingData.booking_channel as any) ?? 'direct',
          reserved_status: (bookingData.reserved_status as any) ?? 'unconfirmed',
          check_in_mode: (bookingData.check_in_mode as any) ?? 'day',
          payment_method_pref: bookingData.payment_method_pref ?? null,
          gst_number: bookingData.gst_number ?? null,
          gst_type: bookingData.gst_type ?? null,
        })
        .select()
        .single()

      if (createBookingError || !booking) {
        throw new Error(`Error creating booking: ${createBookingError?.message || 'unknown'}`)
      }

      // Bulk insert booking_rooms (with pricing snapshot)
      const paxAdults = bookingData.number_of_guests ?? 1
      const paxChildren = bookingData.child_guests ?? 0
      const paxExtra = bookingData.extra_guests ?? 0

      // Expected nights for the stay
      const nights = Math.max(
        1,
        Math.ceil(
          (bookingData.checkOutDate.getTime() - bookingData.checkInDate.getTime()) /
          (1000 * 60 * 60 * 24)
        )
      )

      // Snapshot room rates from room_types.base_price via the rooms' room_type
      const { data: rateRows, error: rateError } = await supabase
        .from('rooms')
        .select('id, room_type:room_type_id(base_price)')
        .in('id', bookingData.rooms.map(r => r.id))

      if (rateError) throw new Error(`Failed to fetch room rates: ${rateError.message}`)

      const roomIdToRate: Record<string, number> = {}
        ; (rateRows || []).forEach((row: any) => {
          const rate = Number(row?.room_type?.base_price || 0)
          roomIdToRate[row.id] = isNaN(rate) ? 0 : rate
        })

      // Check if it's a same-day booking
      const isSameDayBooking = bookingData.checkInDate.toDateString() === bookingData.checkOutDate.toDateString()
      
      const roomRows = bookingData.rooms.map(r => ({
        booking_id: booking.id,
        room_id: r.id,
        check_in_date: formatDateForDatabase(bookingData.checkInDate),
        check_out_date: formatDateForDatabase(bookingData.checkOutDate),
        // Add expected times for same-day bookings
        ...(isSameDayBooking && {
          expected_check_in_time: bookingData.checkInTime ? 
            new Date(`${formatDateForDatabase(bookingData.checkInDate)}T${bookingData.checkInTime}:00`).toISOString() : 
            bookingData.checkInDate.toISOString(),
          expected_check_out_time: bookingData.checkOutTime ? 
            new Date(`${formatDateForDatabase(bookingData.checkOutDate)}T${bookingData.checkOutTime}:00`).toISOString() : 
            bookingData.checkOutDate.toISOString()
        }),
        room_status: 'reserved' as const,
        adults: paxAdults,
        children: paxChildren,
        extra_beds: paxExtra,
        room_rate: roomIdToRate[r.id] || 0,
        expected_nights: nights,
        room_total: (roomIdToRate[r.id] || 0) * nights,
      }))

      const { error: brError } = await supabase
        .from('booking_rooms')
        .insert(roomRows)

      if (brError) throw new Error(`Error attaching rooms: ${brError.message}`)

      // CRITICAL: Ensure room status is updated to 'reserved' for all booked rooms
      // This is a backup mechanism in case the database trigger fails
      try {
        const roomIds = bookingData.rooms.map(r => r.id)
        await supabase
          .from('rooms')
          .update({ status: 'reserved' })
          .in('id', roomIds)
        
        console.log(`Updated room status to 'reserved' for rooms: ${roomIds.join(', ')}`)
      } catch (roomStatusError) {
        console.warn('Failed to update room status manually:', roomStatusError)
        // Don't fail the booking creation if room status update fails
        // The trigger should handle this, but this is a safety net
      }

      // Initialize payment breakdown; totals will be computed from booking_rooms
      const { error: breakdownError } = await supabase
        .from('booking_payment_breakdown')
        .upsert({
          booking_id: booking.id,
          total_amount: bookingData.totalAmount || 0,
          outstanding_amount: bookingData.totalAmount || 0,
          taxed_total_amount: bookingData.totalAmount || 0,
          advance_cash: 0,
          advance_card: 0,
          advance_upi: 0,
          advance_bank: 0,
          receipt_cash: 0,
          receipt_card: 0,
          receipt_upi: 0,
          receipt_bank: 0,
          gst_amount: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          luxury_tax_amount: 0,
          service_charge_amount: 0,
          total_tax_amount: 0,
        }, {
          onConflict: 'booking_id'
        })

      if (breakdownError) {
        // Non-fatal; triggers may still compute later after transactions
        console.warn('Payment breakdown creation failed:', breakdownError)
      } else {
        // DO NOT recompute totals - frontend calculation is already correct
        // The frontend has already calculated the correct totalAmount with taxes
        // We just need to set outstanding_amount to match the totalAmount
        try {
          await supabase
            .from('booking_payment_breakdown')
            .update({
              outstanding_amount: bookingData.totalAmount, // Use frontend calculated amount
            })
            .eq('booking_id', booking.id)
        } catch (updateError) {
          console.warn('Failed to update outstanding amount:', updateError)
        }

        // Frontend calculation is already correct - no need to recalculate taxes
        // The bookingData.totalAmount already includes all taxes calculated in the frontend
      }

      // Record split advance payments (optional) and update breakdown advances/outstanding
      if (bookingData.advancePayments && bookingData.advancePayments.length > 0) {
        // 1) Insert transactions
        const advances = bookingData.advancePayments.filter(p => p.amount && p.amount > 0)
        for (const adv of advances) {
          try {
            await supabase
              .from('payment_transactions')
              .insert({
                booking_id: booking.id,
                amount: adv.amount,
                payment_method: adv.method,
                transaction_type: 'advance',
                collected_by: bookingData.staffId,
                transaction_date: new Date().toISOString(),
                status: 'completed',
              })
      } catch (paymentError) {
            console.warn('Failed to insert advance payment transaction:', paymentError)
          }
        }

        // 2) Update breakdown columns and outstanding
        try {
          const { data: bpd } = await supabase
            .from('booking_payment_breakdown')
            .select('total_amount, total_tax_amount, taxed_total_amount, advance_cash, advance_card, advance_upi, advance_bank')
            .eq('booking_id', booking.id)
            .single()

          // Use frontend-calculated totalAmount instead of database-calculated amount
          const grandTotal = bookingData.totalAmount

          const sumBy = (method: 'cash' | 'card' | 'upi' | 'bank') =>
            advances.filter(a => a.method === method).reduce((s, a) => s + Number(a.amount || 0), 0)

          const advCash = sumBy('cash') + Number(bpd?.advance_cash || 0)
          const advCard = sumBy('card') + Number(bpd?.advance_card || 0)
          const advUpi = sumBy('upi') + Number(bpd?.advance_upi || 0)
          const advBank = sumBy('bank') + Number(bpd?.advance_bank || 0)
          const advTotal = advCash + advCard + advUpi + advBank

          // Outstanding = Grand Total - Total Advances
          const outstandingAmount = Math.max(0, grandTotal - advTotal)

          await supabase
            .from('booking_payment_breakdown')
            .update({
              advance_cash: advCash,
              advance_card: advCard,
              advance_upi: advUpi,
              advance_bank: advBank,
              outstanding_amount: outstandingAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('booking_id', booking.id)
        } catch (bdErr) {
          console.warn('Failed to update payment breakdown advances/outstanding:', bdErr)
        }
      }

      // Optional staff log
      try {
        await supabase.from('staff_logs').insert({
          hotel_id: roomData.hotel_id,
          staff_id: bookingData.staffId,
          action: 'CREATE_BOOKING',
          details: `Created booking ${bookingNumber} for ${bookingData.guestName} - Rooms: ${bookingData.rooms.map(r => r.id).join(', ')} - Amount: ₹${bookingData.totalAmount}`,
        })
      } catch (logError) {
        console.warn('Staff log not available:', logError)
      }

      return booking
    } catch (error) {
      console.error('createBookingWithRooms error:', error)
      throw error
    }
  },

  async updateBooking(bookingId: string, bookingData: {
    guestName?: string
    guestPhone?: string
    guestEmail?: string
    roomId?: string
    staffId?: string
    checkInDate?: Date
    checkOutDate?: Date
    totalAmount?: number
    advanceAmount?: number
    specialRequests?: string
    numberOfGuests?: number
    childGuests?: number
    extraGuests?: number
    arrivalType?: string
    mealPlan?: string
    planName?: string
    purpose?: string
    otaCompany?: string
    roomData?: any[] // New field for multi-room data
  }) {
    try {
    // First, update guest information if provided
    if (bookingData.guestName || bookingData.guestEmail || bookingData.guestPhone) {
        const { data: booking, error: bookingFetchError } = await supabase
        .from("bookings")
        .select("guest_id")
        .eq("id", bookingId)
        .single()

        if (bookingFetchError) {
          console.error("Error fetching booking for guest update:", bookingFetchError)
          throw new Error(`Failed to fetch booking: ${bookingFetchError.message}`)
        }

      if (booking) {
          const { error: guestUpdateError } = await supabase
          .from("guests")
          .update({
            name: bookingData.guestName,
            email: bookingData.guestEmail,
            phone: bookingData.guestPhone,
            updated_at: new Date().toISOString()
          })
          .eq("id", booking.guest_id)

          if (guestUpdateError) {
            console.error("Error updating guest information:", guestUpdateError)
            throw new Error(`Failed to update guest information: ${guestUpdateError.message}`)
          }
      }
    }

      // For existing bookings, allow past date editing (only restrict checkout dates)
    if (bookingData.checkInDate && bookingData.checkOutDate) {
        // Only validate that checkout is after checkin, not that dates are in future
        if (bookingData.checkOutDate <= bookingData.checkInDate) {
          throw new Error("Check-out date must be after check-in date")
        }
      }

      // Update main booking record
      const updateData: any = {}

      if (bookingData.staffId) updateData.staff_id = bookingData.staffId
      if (bookingData.advanceAmount) updateData.advance_amount = bookingData.advanceAmount
      if (bookingData.specialRequests !== undefined) updateData.special_requests = bookingData.specialRequests
      if (bookingData.numberOfGuests !== undefined) updateData.number_of_guests = bookingData.numberOfGuests
      if (bookingData.childGuests !== undefined) updateData.child_guests = bookingData.childGuests
      if (bookingData.extraGuests !== undefined) updateData.extra_guests = bookingData.extraGuests
      if (bookingData.arrivalType) updateData.arrival_type = bookingData.arrivalType
      if (bookingData.mealPlan) updateData.meal_plan = bookingData.mealPlan
      if (bookingData.planName) updateData.plan_name = bookingData.planName
      if (bookingData.purpose !== undefined) updateData.purpose = bookingData.purpose
      if (bookingData.otaCompany !== undefined) updateData.ota_company = bookingData.otaCompany

      // Update primary dates if provided
      if (bookingData.checkInDate) updateData.check_in = formatDateForDatabase(bookingData.checkInDate)
      if (bookingData.checkOutDate) updateData.expected_checkout = formatDateForDatabase(bookingData.checkOutDate)

      updateData.updated_at = new Date().toISOString()

      // Update the main booking record
      const { error: bookingError } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)

      if (bookingError) {
        console.error("Error updating main booking record:", bookingError)
        throw new Error(`Failed to update booking: ${bookingError.message || JSON.stringify(bookingError)}`)
      }

      // Update booking_payment_breakdown if totalAmount is provided
      if (bookingData.totalAmount !== undefined) {
        const { error: breakdownError } = await supabase
          .from("booking_payment_breakdown")
          .upsert({
            booking_id: bookingId,
            total_amount: bookingData.totalAmount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'booking_id'
          })

        if (breakdownError) {
          console.error("Error updating payment breakdown:", breakdownError)
          // Don't throw error here as the main booking was updated successfully
        }
      }

      // Handle room updates if roomData is provided
      if (bookingData.roomData && Array.isArray(bookingData.roomData) && bookingData.roomData.length > 0) {
        // Get existing booking rooms
        const { data: existingRooms, error: fetchRoomsError } = await supabase
          .from("booking_rooms")
          .select("id")
          .eq("booking_id", bookingId)

        if (fetchRoomsError) {
          console.error("Error fetching existing rooms:", fetchRoomsError)
          throw new Error(`Failed to fetch existing rooms: ${fetchRoomsError.message}`)
        }

        const existingRoomIds = existingRooms?.map(r => r.id) || []
        const roomErrors: string[] = []

        // Update or create room records with individual error handling
        for (const room of bookingData.roomData) {
          try {
            // Validate room data structure
            if (!room.roomId || !room.checkInDate || !room.checkOutDate) {
              console.error(`Invalid room data for room ${room.roomNumber || 'unknown'}:`, room)
              roomErrors.push(`Invalid room data for room ${room.roomNumber || 'unknown'}: Missing required fields`)
              continue
            }

            // Validate room status
            const validStatuses = ['reserved', 'checked_in', 'checked_out', 'cancelled']
            if (!validStatuses.includes(room.roomStatus)) {
              console.error(`Invalid room status for room ${room.roomNumber || 'unknown'}:`, room.roomStatus)
              roomErrors.push(`Invalid room status for room ${room.roomNumber || 'unknown'}: ${room.roomStatus}`)
              continue
            }

            if (room.id.startsWith('temp-')) {
              // New room - create it
              const { error: createError } = await supabase
                .from("booking_rooms")
                .insert({
                  booking_id: bookingId,
                  room_id: room.roomId,
                  check_in_date: formatDateForDatabase(room.checkInDate),
                  check_out_date: formatDateForDatabase(room.checkOutDate),
                  room_status: room.roomStatus,
                  room_rate: room.roomRate,
                  room_total: room.roomTotal,
                  expected_nights: Math.ceil((room.checkOutDate.getTime() - room.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                })

              if (createError) {
                console.error(`Error creating room ${room.roomNumber}:`, createError)
                roomErrors.push(`Failed to create room ${room.roomNumber}: ${createError.message}`)
                continue // Continue with other rooms
              }
            } else {
              // Existing room - update it
              const { error: updateError } = await supabase
                .from("booking_rooms")
                .update({
                  room_id: room.roomId,
                  check_in_date: formatDateForDatabase(room.checkInDate),
                  check_out_date: formatDateForDatabase(room.checkOutDate),
                  room_status: room.roomStatus,
                  room_rate: room.roomRate,
                  room_total: room.roomTotal,
                  expected_nights: Math.ceil((room.checkOutDate.getTime() - room.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                })
                .eq("id", room.id)

              if (updateError) {
                console.error(`Error updating room ${room.roomNumber}:`, updateError)
                roomErrors.push(`Failed to update room ${room.roomNumber}: ${updateError.message}`)
                continue // Continue with other rooms
              }
            }
          } catch (roomError) {
            console.error(`Unexpected error with room ${room.roomNumber}:`, roomError)
            roomErrors.push(`Unexpected error with room ${room.roomNumber}: ${roomError instanceof Error ? roomError.message : 'Unknown error'}`)
            continue // Continue with other rooms
          }
        }

        // Remove rooms that are no longer in the list
        const currentRoomIds = bookingData.roomData.map(r => r.id).filter(id => !id.startsWith('temp-'))
        const roomsToDelete = existingRoomIds.filter(id => !currentRoomIds.includes(id))

        if (roomsToDelete.length > 0) {
          try {
            const { error: deleteError } = await supabase
              .from("booking_rooms")
              .delete()
              .in("id", roomsToDelete)

            if (deleteError) {
              console.error("Error deleting rooms:", deleteError)
              roomErrors.push(`Failed to remove some rooms: ${deleteError.message}`)
            }
          } catch (deleteError) {
            console.error("Unexpected error deleting rooms:", deleteError)
            roomErrors.push(`Unexpected error removing rooms: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`)
          }
        }

        // If there were room errors, throw a combined error but don't fail the entire operation
        if (roomErrors.length > 0) {
          console.warn("Some room operations failed:", roomErrors)
          // We'll let the calling function handle this - it can show individual error toasts
          throw new Error(`Room update errors: ${roomErrors.join('; ')}`)
        }
      }

      // Fetch and return updated booking with all relations
      const { data: updatedBooking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
          guest:guest_id(name, email, phone),
          staff:staff_id(name),
          booking_rooms(
            *,
            room:room_id(
              number,
              room_type:room_type_id(name, code, base_price)
            )
          )
        `)
        .eq("id", bookingId)
      .single()

      if (fetchError) {
        console.error("Error fetching updated booking:", fetchError)
        throw new Error(`Failed to fetch updated booking: ${fetchError.message}`)
      }

    return updatedBooking as Booking

    } catch (error) {
      console.error("Error updating booking:", error)
      throw error
    }
  },

  async deleteBooking(bookingId: string, cancellationReason: string = "Deleted by user", cancelledByStaffId?: string) {
    try {
      // Use the cancel_booking function instead of direct deletion
      // This properly handles all related data and maintains audit trail
      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_cancellation_reason: cancellationReason,
        p_cancelled_by_staff_id: cancelledByStaffId || null,
        p_refund_amount: 0,
        p_notes: 'Booking deleted from admin interface'
      })

      if (error) {
        console.error("Error cancelling booking:", error)
        throw error
      }

      return { success: true, cancelledBookingId: data }
    } catch (error) {
      console.error("deleteBooking error:", error)
      throw error
    }
  },

  async getBookingStats() {
    // bookings.check_in column was removed; use booking_rooms.check_in_date instead
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        status,
        booking_rooms(check_in_date)
      `)

    if (error) throw error

    const today = new Date().toISOString().split("T")[0]

    const total = data.length
    const confirmed = data.filter((b: any) => b.status === "confirmed").length
    const checkedIn = data.filter((b: any) => b.status === "checked_in").length
    const checkedOut = data.filter((b: any) => b.status === "checked_out").length
    const checkInsToday = data.filter((b: any) =>
      Array.isArray(b.booking_rooms) && b.booking_rooms.some((br: any) => br.check_in_date === today)
    ).length

    return {
      total,
      confirmed,
      checkedIn,
      checkedOut,
      checkInsToday,
      totalRevenue: 0,
    }
  },

  async checkIn(
    bookingId: string,
    checkInDetails?: { actualCheckIn?: Date; checkInNotes?: string; staffId?: string }
  ) {
    try {
      // 1) Load booking with linked rooms via booking_rooms
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          guest:guest_id(name, phone, email),
          staff:staff_id(name),
          booking_rooms(
            id,
            room_id,
            room_status,
            check_in_date,
            check_out_date,
            room:room_id(id, number, status)
          )
        `)
        .eq("id", bookingId)
        .single()

      if (bookingError || !booking) {
        throw new Error("Booking not found or could not be loaded.")
      }

      // 2) Validate booking status
      if (booking.status === 'checked-in') {
        throw new Error("This booking is already checked-in.")
      }
      if (booking.status === 'checked-out') {
        throw new Error("Cannot check-in a booking that has already been checked-out.")
      }
      if (booking.status === 'cancelled') {
        throw new Error("Cannot check-in a cancelled booking.")
      }

      // 3) Validate rooms availability
      const rooms = (booking.booking_rooms || []).map((br: any) => br.room).filter(Boolean)
      const unavailable = rooms.filter((r: any) => r.status === 'occupied' || r.status === 'blocked')
      if (unavailable.length > 0) {
        const nums = unavailable.map((r: any) => r.number).join(', ')
        throw new Error(`Cannot check-in: Room(s) ${nums} are not available.`)
      }

      const nowIso = (checkInDetails?.actualCheckIn || new Date()).toISOString()

      // 4) Update guest name to ensure consistency
      await supabase
        .from("guests")
        .update({ 
          name: booking.guest.name,
          updated_at: new Date().toISOString()
        })
        .eq("id", booking.guest_id);

      // 5) Update booking -> checked-in
      const { error: updateBookingError } = await supabase
        .from("bookings")
        .update({ status: "checked_in", actual_check_in: nowIso, check_in_notes: checkInDetails?.checkInNotes || null, updated_at: new Date().toISOString(), staff_id: checkInDetails?.staffId || booking.staff_id })
        .eq("id", bookingId)

      if (updateBookingError) throw updateBookingError

      // 6) Update booking_rooms for this booking
      const { error: updateBrError } = await supabase
        .from("booking_rooms")
        .update({ room_status: "checked_in", actual_check_in: nowIso, updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)

      if (updateBrError) throw updateBrError

      // 7) Update all related rooms to occupied
      const roomIds = (booking.booking_rooms || []).map((br: any) => br.room_id)
      if (roomIds.length > 0) {
        const { error: roomsError } = await supabase
          .from("rooms")
          .update({ status: "occupied" })
          .in("id", roomIds)

        if (roomsError) throw roomsError
      }

      // 8) Try to log staff action (non-blocking)
      try {
        await supabase.from("staff_logs").insert({
          hotel_id: booking.hotel_id,
          staff_id: checkInDetails?.staffId || booking.staff_id,
          action: "CHECK_IN",
          details: `Checked-in booking ${booking.booking_number} for rooms ${(booking.booking_rooms || []).map((br: any) => br.room?.number).filter(Boolean).join(', ')}`
        })
      } catch (logError) {
        console.warn("Staff log not available:", logError)
      }

      return { success: true }
    } catch (error) {
      console.error("checkIn error:", error)
      throw error
    }
  },
  async checkOut(
    bookingId: string,
    actualCheckOutDate: Date,
    checkoutDetails: {
      earlyCheckoutReason?: string,
      priceAdjustment: number,
      finalAmount: number,
      adjustmentReason: string,
      remainingBalance?: number,
      remainingBalanceCollectedBy?: string,
      remainingBalancePaymentMethod?: string,
      roomId?: string // Optional: if provided, checkout only this specific room
    }
  ) {
    try {
      console.log(`Processing checkout for booking ${bookingId} with actualCheckOutDate:`, actualCheckOutDate);

      // Load booking with linked rooms via booking_rooms
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guest_id(name, email, phone),
          staff:staff_id(name),
          payment_breakdown:booking_payment_breakdown(*),
          booking_rooms(
            id,
            room_id,
            room_status,
            check_in_date,
            check_out_date,
            actual_check_in,
            actual_check_out,
            room:room_id(id, number, maintenance_status)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error(`Error fetching booking ${bookingId}:`, bookingError);
        throw bookingError;
      }

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      // Check if booking can be checked out (allow confirmed and checked_in bookings)
      if (!['confirmed', 'checked_in'].includes(booking.status)) {
        throw new Error(`Booking cannot be checked out. Current status: ${booking.status}`);
      }

      // Determine which rooms to checkout
      let roomsToCheckout: any[] = [];
      if (checkoutDetails.roomId) {
        // Single room checkout - find the specific room
        const specificRoom = booking.booking_rooms?.find((br: any) => br.room_id === checkoutDetails.roomId);
        if (!specificRoom) {
          throw new Error(`Room ${checkoutDetails.roomId} not found in booking ${bookingId}`);
        }
        roomsToCheckout = [specificRoom];
      } else {
        // All rooms checkout (legacy behavior)
        roomsToCheckout = booking.booking_rooms || [];
      }

      const roomIds = roomsToCheckout.map((br: any) => br.room_id);

      if (roomIds.length > 0) {
        // Update booking_rooms status
        const updateData: any = { 
          room_status: 'checked_out', 
        actual_check_out: actualCheckOutDate.toISOString(),
          updated_at: new Date().toISOString() 
        };

        // For no-show rooms (reserved status), set actual_check_in to the same time as checkout
        if (roomsToCheckout.some((br: any) => br.room_status === 'reserved')) {
          updateData.actual_check_in = actualCheckOutDate.toISOString();
        }

        const updateQuery = supabase
          .from('booking_rooms')
          .update(updateData)
          .eq('booking_id', bookingId);

        // If specific room, add room_id filter
        if (checkoutDetails.roomId) {
          updateQuery.eq('room_id', checkoutDetails.roomId);
        }

        const { error: brErr } = await updateQuery;
        
        if (brErr) {
          console.error('Error updating booking_rooms:', brErr);
          throw brErr;
        }

        // Update rooms to available (using status field, not maintenance_status)
      const { error: roomError } = await supabase
          .from('rooms')
          .update({ 
            status: 'available',
            updated_at: new Date().toISOString()
          })
          .in('id', roomIds);

      if (roomError) {
          console.warn('Failed to update rooms to available:', roomError);
        }
      }

      // Update booking_payment_breakdown with final amounts
      if (checkoutDetails.finalAmount > 0) {
        const { error: breakdownError } = await supabase
          .from('booking_payment_breakdown')
          .update({
            total_amount: checkoutDetails.finalAmount,
            price_adjustment: checkoutDetails.priceAdjustment,
            taxed_total_amount: checkoutDetails.finalAmount,
            outstanding_amount: checkoutDetails.remainingBalance || 0,
            updated_at: new Date().toISOString()
          })
          .eq('booking_id', bookingId);

        if (breakdownError) {
          console.warn('Failed to update payment breakdown:', breakdownError);
        }
      }

      // Note: Booking status update is now handled automatically by database triggers
      // The triggers will update booking status when all rooms are checked out

      // Create housekeeping tasks for all rooms
      try {
        if (roomIds.length > 0) {
          const tasks = roomIds.map((rid: string) => ({
            room_id: rid,
            task_type: 'checkout_cleaning',
            status: 'pending',
          notes: `Room needs cleaning after checkout. Booking: ${booking.booking_number}`,
            priority: 'high',
            assigned_to: null,
          created_at: new Date().toISOString(),
            due_by: new Date(new Date().getTime() + 3600000).toISOString(),
          }));
          await supabase.from('housekeeping_tasks').insert(tasks);
        }
      } catch (err) {
        console.warn('Failed to create housekeeping tasks:', err);
      }

      // Log the action
      try {
        await supabase.from("staff_logs").insert({
          hotel_id: booking.hotel_id || null,
          staff_id: booking.staff_id,
          action: "CHECK_OUT",
          details: JSON.stringify({
            booking_id: bookingId,
            booking_number: booking.booking_number,
            guest_name: booking.guest?.name,
            room_numbers: (booking.booking_rooms || []).map((br: any) => br.room?.number).filter(Boolean).join(', '),
            actual_checkout: actualCheckOutDate.toISOString(),
            price_adjustment: checkoutDetails.priceAdjustment,
            final_amount: checkoutDetails.finalAmount,
            adjustment_reason: checkoutDetails.adjustmentReason
          }),
          ip_address: "192.168.1.100" // In a real app, this would come from the request
        });
      } catch (logError) {
        console.warn("Staff log not available:", logError);
      }

      // Calculate the checkout result using the room being checked out
      const roomForCalculation = checkoutDetails.roomId 
        ? roomsToCheckout[0] 
        : booking.booking_rooms?.[0];
        
      if (!roomForCalculation) {
        throw new Error('No room found for checkout calculation');
      }

      const scheduledCheckOut = new Date(roomForCalculation.check_out_date);
      const checkInDate = new Date(roomForCalculation.check_in_date);
      const scheduledDays = Math.ceil((scheduledCheckOut.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const actualDays = Math.ceil((actualCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysDifference = scheduledDays - actualDays;

      return {
        success: true,
        booking: booking,
        priceAdjustment: checkoutDetails.priceAdjustment,
        finalAmount: checkoutDetails.finalAmount,
        adjustmentReason: checkoutDetails.adjustmentReason,
        isEarlyCheckout: daysDifference > 0,
        isLateCheckout: daysDifference < 0,
        daysDifference
      };
    } catch (error) {
      console.error("Error in checkout process:", error);
      return {
        success: false,
        error: (error as Error).message || "Unknown error during checkout"
      };
    }
  },

  // New function for single room checkout (for homepage use)
  async checkOutRoom(
    bookingId: string,
    roomId: string,
    actualCheckOutDate: Date,
    checkoutDetails: {
      earlyCheckoutReason?: string,
      priceAdjustment?: number,
      finalAmount?: number,
      adjustmentReason?: string,
      remainingBalance?: number,
      remainingBalanceCollectedBy?: string,
      remainingBalancePaymentMethod?: string
    }
  ) {
    try {
      console.log(`Processing single room checkout for booking ${bookingId}, room ${roomId}`);

      // Use the new database function for single room checkout
      const { data: result, error: rpcError } = await supabase.rpc('checkout_single_room', {
        p_booking_id: bookingId,
        p_room_id: roomId,
        p_actual_checkout: actualCheckOutDate.toISOString(),
        p_staff_id: checkoutDetails.remainingBalanceCollectedBy || null
      });

      if (rpcError) {
        console.error('RPC checkout error:', rpcError);
        console.error('Error details:', {
          bookingId,
          roomId,
          actualCheckOutDate: actualCheckOutDate.toISOString(),
          error: rpcError
        });
        throw new Error(`Database error during checkout: ${rpcError.message}`);
      }

      if (!result) {
        throw new Error('No result returned from checkout function');
      }

      if (!result.success) {
        console.error('Checkout function returned error:', result);
        throw new Error(result.error || 'Checkout failed - unknown error');
      }

      // Load updated booking data for response
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guest_id(name, email, phone),
          staff:staff_id(name),
          payment_breakdown:booking_payment_breakdown(*),
          booking_rooms(
            id,
            room_id,
            room_status,
            check_in_date,
            check_out_date,
            actual_check_in,
            actual_check_out,
            room:room_id(id, number, status)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.warn('Failed to load updated booking data:', bookingError);
      }

      // Find the checked out room
      const roomToCheckout = booking?.booking_rooms?.find((br: any) => br.room_id === roomId);

      // Calculate checkout timing
      let isEarlyCheckout = false;
      let isLateCheckout = false;
      let daysDifference = 0;

      if (roomToCheckout) {
        const scheduledCheckOut = new Date(roomToCheckout.check_out_date);
        const checkInDate = new Date(roomToCheckout.check_in_date);
        const scheduledDays = Math.ceil((scheduledCheckOut.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const actualDays = Math.ceil((actualCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        daysDifference = scheduledDays - actualDays;
        isEarlyCheckout = daysDifference > 0;
        isLateCheckout = daysDifference < 0;
      }

      return {
        success: true,
        booking: booking,
        room: roomToCheckout,
        priceAdjustment: checkoutDetails.priceAdjustment || 0,
        finalAmount: checkoutDetails.finalAmount || 0,
        adjustmentReason: checkoutDetails.adjustmentReason || 'Room checkout',
        isEarlyCheckout,
        isLateCheckout,
        daysDifference,
        message: result.message || 'Room checked out successfully'
      };
    } catch (error) {
      console.error("Error in room checkout process:", error);
      
      // Try to log the error to the database for debugging
      try {
        await supabase.rpc('log_checkout_error', {
          p_booking_id: bookingId,
          p_room_id: roomId,
          p_error_message: (error as Error).message || 'Unknown error',
          p_staff_id: checkoutDetails.remainingBalanceCollectedBy || null
        });
      } catch (logError) {
        console.warn('Failed to log checkout error:', logError);
      }
      
      return {
        success: false,
        error: (error as Error).message || "Unknown error during room checkout"
      };
    }
  },

  // Get checkout statistics
  async getCheckoutStatistics(startDate?: Date, endDate?: Date) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const end = endDate || new Date()

      // Get checkout statistics from the database
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          actual_check_out,
          actual_check_in,
          planned_nights,
          actual_nights
        `)
        .gte('actual_check_out::date', start.toISOString().split('T')[0])
        .lte('actual_check_out::date', end.toISOString().split('T')[0])
        .eq('status', 'checked_out')

      if (error) throw error

      const totalCheckouts = data?.length || 0
      const onTimeCheckouts = data?.filter(b => {
        if (!b.actual_check_out || !b.planned_nights || !b.actual_nights) return false
        return b.actual_nights <= b.planned_nights
      }).length || 0
      const lateCheckouts = totalCheckouts - onTimeCheckouts

      return {
        totalCheckouts,
        onTimeCheckouts,
        lateCheckouts,
        gracePeriodUsed: 0, // This would need to be tracked separately
        totalLateFees: 0, // This would need to be tracked separately
        averageLateTime: 0 // This would need to be calculated
      }
    } catch (error) {
      console.error('Failed to get checkout statistics:', error)
      return {
        totalCheckouts: 0,
        onTimeCheckouts: 0,
        lateCheckouts: 0,
        gracePeriodUsed: 0,
        totalLateFees: 0,
        averageLateTime: 0
      }
    }
  },

  // Get active checkout alerts
  async getActiveCheckoutAlerts() {
    try {
      const { data, error } = await supabase
        .from('checkout_notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to fetch checkout alerts:', error)
      return []
    }
  },

  // Dismiss checkout notification
  async dismissNotification(notificationId: string, dismissedBy: string) {
    try {
      await supabase
        .from('checkout_notifications')
        .update({
          is_active: false,
          dismissed_at: new Date().toISOString(),
          dismissed_by: dismissedBy
        })
        .eq('id', notificationId)
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  },

  async updateBookingRoomPaxAndTariff(bookingRoomId: string, updates: {
    adults?: number
    children?: number
    extra_beds?: number
    room_rate?: number
    discount_type?: 'none' | 'percent' | 'flat'
    discount_value?: number
    apply_inclusive_tax?: boolean
  }) {
    const { data, error } = await supabase
      .from("booking_rooms")
      .update(updates)
      .eq("id", bookingRoomId)
      .select()
      .single()

    if (error) throw error

    // Update room_total directly
    const roomTotal = (updates.room_rate || data.room_rate || 0) * (data.expected_nights || 1)
    await supabase
      .from("booking_rooms")
      .update({ room_total: roomTotal })
      .eq("id", bookingRoomId)

    // DO NOT recalculate payment breakdown - frontend calculation is already correct
    // The frontend has already calculated the correct totalAmount with taxes

    return data
  },

  async createAdvancePayment(bookingId: string, paymentData: {
    amount: number
    payment_method: string
    reference_number?: string
    notes?: string
    collected_by?: string
  }) {
    // Validate parameters before RPC call
    if (!bookingId || !paymentData.amount || !paymentData.payment_method) {
      throw new Error("Missing required parameters for payment")
    }

    // Validate payment method against database constraint
    const validMethods = ['upi', 'card', 'cash', 'bank']
    const normalizedMethod = paymentData.payment_method.toLowerCase()
    if (!validMethods.includes(normalizedMethod)) {
      throw new Error(`Invalid payment method: ${paymentData.payment_method}. Allowed: ${validMethods.join(', ')}`)
    }

    console.log("Calling add_payment_transaction with:", {
      p_booking_id: bookingId,
      p_amount: paymentData.amount,
      p_payment_method: normalizedMethod,
      p_transaction_type: 'advance',
      p_collected_by: paymentData.collected_by
    })

    const { data, error } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id: bookingId,
        amount: paymentData.amount,
        payment_method: normalizedMethod,
        transaction_type: 'advance',
        collected_by: paymentData.collected_by,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes
      })
      .select()
      .single()

    if (error) {
      console.error("Payment transaction insert error:", error)
      throw new Error(`Payment failed: ${error.message}`)
    }

    // The trigger will automatically update the booking_payment_breakdown
    // No need to manually update it here
    return data
  },

  async getProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("category, name")
    
    if (error) throw error
    return data
  },

  async createChargePosting(bookingId: string, chargeItems: Array<{
    product_id: string
    quantity: number
    rate: number
    total_amount: number
    cgst_amount: number
    sgst_amount: number
  }>) {
    // Insert charge items
    const { data, error } = await supabase
      .from("charge_items")
      .insert(chargeItems.map(item => ({
        ...item,
        booking_id: bookingId
      })))
      .select()

    if (error) throw error

    // The trigger will automatically update the booking_payment_breakdown
    // No need to manually update it here - this prevents conflicts

    return data
  },

  async getChargeItems(bookingId: string) {
    const { data, error } = await supabase
      .from("charge_items")
      .select(`
        *,
        product:product_id(name, category)
      `)
      .eq("booking_id", bookingId)
      .order("created_at")
    
    if (error) throw error
    return data.map(item => ({
      ...item,
      product_name: item.product?.name
    }))
  },
}

export const reservationService = {
  async checkInReservation(
    reservationId: string,
    checkInDetails?: { actualCheckIn?: Date; checkInNotes?: string; staffId?: string }
  ) {
    // Load reservation with room
    const { data: reservation, error: resErr } = await supabase
      .from("reservations")
      .select(`
        *,
        guest:guest_id(name, phone, email),
        staff:staff_id(name),
        room:room_id(id, number, status)
      `)
      .eq("id", reservationId)
      .single()

    if (resErr || !reservation) {
      throw new Error("Reservation not found or could not be loaded.")
    }

    if (reservation.status === 'checked-in') {
      throw new Error("This reservation is already checked-in.")
    }
    if (reservation.status === 'checked-out') {
      throw new Error("Cannot check-in a reservation that has already been checked-out.")
    }
    if (reservation.status === 'cancelled') {
      throw new Error("Cannot check-in a cancelled reservation.")
    }

    // Validate room availability
    if (reservation.room?.status === 'occupied' || reservation.room?.status === 'blocked') {
      throw new Error(`Cannot check-in: Room ${reservation.room?.number} is not available.`)
    }

    const nowIso = (checkInDetails?.actualCheckIn || new Date()).toISOString()

    // Update reservation
    const { error: upResErr } = await supabase
      .from("reservations")
      .update({ status: "checked_in", updated_at: new Date().toISOString() })
      .eq("id", reservationId)
    if (upResErr) throw upResErr

    // Update room
    const { error: upRoomErr } = await supabase
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", reservation.room_id)
    if (upRoomErr) throw upRoomErr

    // Log (best-effort)
    try {
      await supabase.from("staff_logs").insert({
        hotel_id: reservation.hotel_id,
        staff_id: checkInDetails?.staffId || reservation.staff_id,
        action: "CHECK_IN_RESERVATION",
        details: `Checked-in reservation ${reservation.reservation_number} for room ${reservation.room?.number}`
      })
    } catch { }

    return { success: true }
  },
  async getReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        guest:guest_id(name, email, phone),
        room:room_id(number, room_type:room_type_id(name, code, base_price)),
        staff:staff_id(name)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data as Reservation[]
  },

  async getCheckInReadyReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        guest:guest_id(name, email, phone, id_type, id_number),
        room:room_id(id, number, status, type, room_type:room_type_id(name, code, base_price)),
        staff:staff_id(id, name)
      `)
      .in("status", ["confirmed", "pending"])
      .lte("check_in", new Date().toISOString().split('T')[0]) // Check-in date is today or earlier
      .order("check_in", { ascending: true })

    if (error) throw error
    return data as Reservation[]
  },

  async createReservation(reservationData: {
    guestName: string
    guestPhone: string
    guestEmail?: string
    staffId: string
    roomId: string
    checkInDate: Date
    checkOutDate: Date
    specialRequests?: string
    number_of_guests?: number
    child_guests?: number
    extra_guests?: number
    meal_plan?: 'CP' | 'MAP' | 'EP'
    plan_name?: string
    purpose?: string
    ota_company?: string
    arrival_type?: 'walk_in' | 'phone' | 'online' | 'OTA' | 'agent' | 'corporate'
    totalAmount: number
    advancePayments?: { method: 'upi' | 'card' | 'cash' | 'bank'; amount: number }[]
  }) {
    try {
      // Get room details for hotel_id and pricing
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select(`
          id, number, hotel_id, price,
          room_type:room_type_id(id, name, code, base_price, max_pax)
        `)
        .eq('id', reservationData.roomId)
        .single()

      if (roomError || !roomData) {
        throw new Error(`Room not found: ${roomError?.message || 'unknown'}`)
      }

      // Check room availability
      const isAvailable = await bookingService.checkRoomAvailability(
        reservationData.roomId,
        reservationData.checkInDate,
        reservationData.checkOutDate
      )

      if (!isAvailable) {
        throw new Error('Room is not available for the selected dates')
      }

      // Create new guest for each reservation (don't reuse existing guests)
      // This ensures each reservation has its own guest record, even with same phone number
      const newGuest = await guestService.createGuest({
        name: reservationData.guestName,
        email: reservationData.guestEmail || '',
        phone: reservationData.guestPhone,
        address: {
          street_address: '',
          city: 'PUDUCHERRY',
          postal_code: '605003',
          state: 'Tamil Nadu',
          country: 'India'
        },
        id_type: 'aadhar',
        id_number: `TEMP${Date.now()}`
      })
      const guestId = newGuest.id

      const reservationNumber = `RES${Date.now()}${Math.floor(Math.random() * 1000)}`

      // Create reservation record
      const { data: reservation, error: createReservationError } = await supabase
        .from('reservations')
        .insert({
          reservation_number: reservationNumber,
          hotel_id: roomData.hotel_id,
          guest_id: guestId,
          room_id: reservationData.roomId,
          staff_id: reservationData.staffId,
          check_in: formatDateForDatabase(reservationData.checkInDate),
          check_out: formatDateForDatabase(reservationData.checkOutDate),
          arrival_type: reservationData.arrival_type || 'walk_in',
          special_requests: reservationData.specialRequests || '',
          status: 'confirmed',
          total_amount: reservationData.totalAmount,
          advance_amount: reservationData.advancePayments?.reduce((sum, p) => sum + p.amount, 0) || 0,
          payment_method: reservationData.advancePayments?.[0]?.method || 'cash'
        })
        .select()
        .single()

      if (createReservationError || !reservation) {
        throw new Error(`Error creating reservation: ${createReservationError?.message || 'unknown'}`)
      }

      // Process advance payments if any
      if (reservationData.advancePayments && reservationData.advancePayments.length > 0) {
        for (const payment of reservationData.advancePayments) {
          if (payment.amount > 0) {
            const { error: paymentError } = await supabase.rpc('add_payment_transaction', {
              p_booking_id: reservation.id,
              p_transaction_type: 'advance',
              p_payment_method: payment.method,
              p_amount: payment.amount,
              p_description: 'Advance payment for reservation'
            })

            if (paymentError) {
              console.warn(`Failed to record payment transaction: ${paymentError.message}`)
            }
          }
        }
      }

      return reservation
    } catch (error) {
      console.error('Error creating reservation:', error)
      throw error
    }
  }
}

// Maintenance/Blocking service
export const maintenanceService = {
  async hasOverlap(roomId: string, fromIso: string, toIso: string) {
    // Check if there are any reservations/check-ins overlapping this window
    const { data, error } = await supabase
      .from('booking_rooms')
      .select('id, room_status, check_in_date, check_out_date')
      .eq('room_id', roomId)
      .in('room_status', ['reserved', 'checked_in'])
      .or(`check_in_date.lte.${toIso.split('T')[0]},check_out_date.gte.${fromIso.split('T')[0]}`)
    if (error) throw error
    return (data || []).length > 0
  },

  async createMaintenanceBlock(params: {
    roomId: string
    requestType: string
    requestInfo?: string
    blockCheckin: boolean
    from: Date
    to: Date
    staffId?: string | null
  }) {
    const startIso = params.from.toISOString()
    const endIso = params.to.toISOString()

    // Insert into blocked_rooms
    const reason = `${params.requestType}${params.requestInfo ? ': ' + params.requestInfo : ''}`
    const { data: br, error } = await supabase
      .from('blocked_rooms')
      .insert({
        room_id: params.roomId,
        reason,
        start_at: startIso,
        end_at: endIso,
        created_by: params.staffId || null,
      })
      .select('id')
      .single()
    if (error) throw error

    // Optionally block room now
    if (params.blockCheckin) {
      const { error: rErr } = await supabase
        .from('rooms')
        .update({ status: 'blocked' })
        .eq('id', params.roomId)
      if (rErr) throw rErr
    }

    // Log
    try {
      await supabase.from('staff_logs').insert({
        hotel_id: null,
        staff_id: params.staffId || null,
        action: 'MAINTENANCE_POSTING',
        details: JSON.stringify({
          room_id: params.roomId,
          request_type: params.requestType,
          from: startIso,
          to: endIso,
          block_checkin: params.blockCheckin,
          blocked_room_id: br?.id,
        }),
      })
    } catch { }

    return { success: true, id: br?.id }
  },
}

export const housekeepingService = {
  async ensureTableExists() {
    try {
      // Try to create the table if it doesn't exist
      const { error } = await supabase.rpc('create_housekeeping_table_if_not_exists')
      if (error) {
        console.warn("Could not create table via RPC, table might already exist:", error)
      }
    } catch (error) {
      console.warn("Table creation check failed:", error)
    }
  },

  async getTasks() {
    try {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.warn("Failed to fetch housekeeping tasks:", error)
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST116') {
          console.warn("Table 'housekeeping_tasks' does not exist")
          return []
        }
        throw error
      }
      return data as HousekeepingTask[]
    } catch (error) {
      console.warn("Failed to fetch housekeeping tasks:", error)
      return []
    }
  },

  async getTasksByStatus(status: string) {
    try {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .select("*")
        .eq("status", status)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn("Table 'housekeeping_tasks' does not exist")
          return []
        }
        throw error
      }
      return data as HousekeepingTask[]
    } catch (error) {
      console.warn("Failed to fetch tasks by status:", error)
      return []
    }
  },

  async getTasksByRoom(roomId: string) {
    try {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn("Table 'housekeeping_tasks' does not exist")
          return []
        }
        throw error
      }
      return data as HousekeepingTask[]
    } catch (error) {
      console.warn("Failed to fetch tasks by room:", error)
      return []
    }
  },

  async createTask(taskData: {
    roomId: string
    assignedTo?: string
    type: string
    priority: string
    estimatedTime: number
    notes?: string
    scheduledDate?: Date
  }) {
    const taskNumber = `HK${Date.now().toString().slice(-8)}`

    try {
      const hotelId = await getHotelId()
      // Try different column name variations
      const columnVariations = [
        // Standard column names - without scheduled_date
        {
          task_number: taskNumber,
          hotel_id: hotelId,
          room_id: taskData.roomId,
          assigned_to: taskData.assignedTo || null,
          type: taskData.type,
          status: "pending",
          priority: taskData.priority,
          estimated_time: taskData.estimatedTime,
          notes: taskData.notes || null
        },
        // Alternative column names (common variations) - without scheduled_date
        {
          taskNumber: taskNumber,
          hotelId: hotelId,
          roomId: taskData.roomId,
          assignedTo: taskData.assignedTo || null,
          type: taskData.type,
          status: "pending",
          priority: taskData.priority,
          estimatedTime: taskData.estimatedTime,
          notes: taskData.notes || null
        },
        // Snake case variations - without scheduled_date
        {
          task_number: taskNumber,
          hotel_id: hotelId,
          room_id: taskData.roomId,
          assigned_to: taskData.assignedTo || null,
          type: taskData.type,
          status: "pending",
          priority: taskData.priority,
          estimated_time: taskData.estimatedTime,
          notes: taskData.notes || null
        }
      ]

      let data = null
      let error = null

      // Try each column variation
      for (let i = 0; i < columnVariations.length; i++) {
        try {
          console.log(`Trying column variation ${i + 1}:`, columnVariations[i])

          const result = await supabase
            .from("housekeeping_tasks")
            .insert(columnVariations[i])
            .select()
            .single()

          if (result.error) {
            console.log(`Variation ${i + 1} failed:`, result.error)
            error = result.error
            continue
          }

          data = result.data
          error = null
          console.log(`Variation ${i + 1} succeeded!`)
          break

        } catch (variationError) {
          console.log(`Variation ${i + 1} threw error:`, variationError)
          error = variationError
          continue
        }
      }

      if (error || !data) {
        console.error("All column variations failed:", error)
        throw error || new Error("All column variations failed")
      }

      // Log task creation
      try {
        await supabase
          .from("staff_logs")
          .insert({
            hotel_id: "550e8400-e29b-41d4-a716-446655440000",
            staff_id: taskData.assignedTo || "system",
            action: "housekeeping_task_created",
            details: `Housekeeping task ${taskNumber} created for Room ${taskData.roomId}. Type: ${taskData.type}, Priority: ${taskData.priority}`
          })
      } catch (logError) {
        console.warn("Failed to log task creation:", logError)
      }

      return data as HousekeepingTask
    } catch (error) {
      console.error("Task creation failed, checking if table exists:", error)

      // Check if the table exists
      const { error: tableCheckError } = await supabase
        .from("housekeeping_tasks")
        .select("id")
        .limit(1)

      if (tableCheckError) {
        console.error("Table check failed:", tableCheckError)

        // Create a mock task object for now, since the table doesn't exist
        const mockTask: HousekeepingTask = {
          id: `mock-${Date.now()}`,
          task_number: taskNumber,
          hotel_id: "550e8400-e29b-41d4-a716-446655440000",
          room_id: taskData.roomId,
          assigned_to: taskData.assignedTo || undefined,
          type: taskData.type,
          status: "pending",
          priority: taskData.priority,
          estimated_time: taskData.estimatedTime,
          notes: taskData.notes || undefined,
          // scheduled_date: taskData.scheduledDate ? taskData.scheduledDate.toISOString() : undefined, // Removed since column doesn't exist
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          room: {
            number: "Unknown",
            type: "Unknown",
            status: "Unknown"
          },
          staff: taskData.assignedTo ? {
            name: "Unknown",
            role: "Unknown"
          } : undefined
        }

        console.warn("Returning mock task since table doesn't exist:", mockTask)
        return mockTask
      }

      // If we get here, the table exists but something else failed
      throw error
    }
  },

  async updateTaskStatus(taskId: string, status: string, assignedTo?: string, notes?: string) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (assignedTo) updateData.assigned_to = assignedTo
    if (notes) updateData.notes = notes

    const { data, error } = await supabase
      .from("housekeeping_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select(`
        *,
        room:room_id(number, type, status),
        staff:assigned_to(name, role)
      `)
      .single()

    if (error) throw error

    // If task is completed, update room status
    if (status === "completed") {
      try {
        await roomService.completeHousekeepingTask(taskId, data.room_id, "available", notes)
      } catch (roomError) {
        console.warn("Failed to update room status after task completion:", roomError)
      }
    }

    // Log status update
    try {
      await supabase
        .from("staff_logs")
        .insert({
          hotel_id: "550e8400-e29b-41d4-a716-446655440000",
          staff_id: assignedTo || data.assigned_to || "system",
          action: "housekeeping_task_updated",
          details: `Housekeeping task ${data.task_number} status updated to ${status}. Room: ${data.room?.number}`
        })
    } catch (logError) {
      console.warn("Failed to log task update:", logError)
    }

    return data as HousekeepingTask
  },

  async assignTask(taskId: string, staffId: string) {
    const { data, error } = await supabase
      .from("housekeeping_tasks")
      .update({
        assigned_to: staffId,
        status: "assigned",
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .select(`
        *,
        room:room_id(number, type, status),
        staff:assigned_to(name, role)
      `)
      .single()

    if (error) throw error

    // Log task assignment
    try {
      await supabase
        .from("staff_logs")
        .insert({
          hotel_id: "550e8400-e29b-41d4-a716-446655440000",
          staff_id: staffId,
          action: "housekeeping_task_assigned",
          details: `Housekeeping task ${data.task_number} assigned to staff. Room: ${data.room?.number}`
        })
    } catch (logError) {
      console.warn("Failed to log task assignment:", logError)
    }

    return data as HousekeepingTask
  },

  async startTask(taskId: string, staffId: string) {
    const { data, error } = await supabase
      .from("housekeeping_tasks")
      .update({
        status: "in-progress",
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .select(`
        *,
        room:room_id(number, type, status),
        staff:assigned_to(name, role)
      `)
      .single()

    if (error) throw error

    // Log task start
    try {
      await supabase
        .from("staff_logs")
        .insert({
          hotel_id: "550e8400-e29b-41d4-a716-446655440000",
          staff_id: staffId,
          action: "housekeeping_task_started",
          details: `Housekeeping task ${data.task_number} started. Room: ${data.room?.number}`
        })
    } catch (logError) {
      console.warn("Failed to log task start:", logError)
    }

    return data as HousekeepingTask
  },

  async completeTask(taskId: string, staffId: string, finalRoomStatus: string = "available", completionNotes?: string) {
    // Complete the housekeeping task and update room status
    const result = await roomService.completeHousekeepingTask(taskId, staffId, finalRoomStatus, completionNotes)

    return result
  },

  async updateTask(taskId: string, taskData: {
    roomId?: string
    assignedTo?: string
    type?: string
    priority?: string
    estimatedTime?: number
    notes?: string
    scheduledDate?: Date
  }) {
    const updateData: any = {}
    if (taskData.roomId) updateData.room_id = taskData.roomId
    if (taskData.assignedTo) updateData.assigned_to = taskData.assignedTo
    if (taskData.type) updateData.type = taskData.type
    if (taskData.priority) updateData.priority = taskData.priority
    if (taskData.estimatedTime) updateData.estimated_time = taskData.estimatedTime
    if (taskData.notes !== undefined) updateData.notes = taskData.notes
    if (taskData.scheduledDate) updateData.scheduled_date = taskData.scheduledDate.toISOString()

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("housekeeping_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select(`
        *,
        room:room_id(number, type, status),
        staff:assigned_to(name, role)
      `)
      .single()

    if (error) throw error

    // Log task update
    try {
      await supabase
        .from("staff_logs")
        .insert({
          hotel_id: "550e8400-e29b-41d4-a716-446655440000",
          staff_id: taskData.assignedTo || data.assigned_to || "system",
          action: "housekeeping_task_updated",
          details: `Housekeeping task ${data.task_number} updated. Room: ${data.room?.number}`
        })
    } catch (logError) {
      console.warn("Failed to log task update:", logError)
    }

    return data as HousekeepingTask
  },

  async deleteTask(taskId: string) {
    // Get task details before deletion for logging
    const { data: taskToDelete } = await supabase
      .from("housekeeping_tasks")
      .select(`
        task_number,
        room:room_id(number)
      `)
      .eq("id", taskId)
      .single()

    const { error } = await supabase
      .from("housekeeping_tasks")
      .delete()
      .eq("id", taskId)

    if (error) throw error

    // Log task deletion
    if (taskToDelete) {
      try {
        await supabase
          .from("staff_logs")
          .insert({
            hotel_id: "550e8400-e29b-41d4-a716-446655440000",
            staff_id: "system",
            action: "housekeeping_task_deleted",
            details: `Housekeeping task ${taskToDelete.task_number} deleted. Room: ${Array.isArray(taskToDelete.room) ? (taskToDelete.room as any)[0]?.number : (taskToDelete.room as any)?.number}`
          })
      } catch (logError) {
        console.warn("Failed to log task deletion:", logError)
      }
    }

    return true
  },

  async getTaskStats() {
    const { data, error } = await supabase.from("housekeeping_tasks").select("status, priority, estimated_time")

    if (error) throw error

    const stats = {
      total: data.length,
      pending: data.filter((task) => task.status === "pending").length,
      assigned: data.filter((task) => task.status === "assigned").length,
      inProgress: data.filter((task) => task.status === "in-progress").length,
      completed: data.filter((task) => task.status === "completed").length,
      highPriority: data.filter((task) => task.priority === "high").length,
      mediumPriority: data.filter((task) => task.priority === "medium").length,
      lowPriority: data.filter((task) => task.priority === "low").length
    }

    return stats
  },

  // Get housekeeping schedule for a specific date
  async getScheduleForDate(date: Date) {
    const dateString = date.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from("housekeeping_tasks")
      .select(`
        *,
        room:room_id(number, type, status),
        staff:assigned_to(name, role)
      `)
      .order("priority", { ascending: false })
      .order("estimated_time", { ascending: true })

    if (error) throw error
    return data as HousekeepingTask[]
  },

  // Bulk create tasks (for scheduled cleaning, maintenance, etc.)
  async bulkCreateTasks(tasks: Array<{
    roomId: string
    type: string
    priority: string
    estimatedTime: number
    notes?: string
    assignedTo?: string
  }>) {
    const results = []
    const errors = []

    for (const task of tasks) {
      try {
        const result = await this.createTask(task)
        results.push(result)
      } catch (error) {
        errors.push({ task, error: error instanceof Error ? error.message : String(error) })
      }
    }

    return {
      success: results,
      errors,
      totalProcessed: tasks.length,
      successCount: results.length,
      errorCount: errors.length
    }
  }
}

export const staffLogService = {
  async getLogs() {
    const { data, error } = await supabase
      .from("staff_logs")
      .select(`
        *,
        staff:staff_id(name)
      `)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error
    return data as StaffLog[]
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('housekeeping_tasks')
      .delete()
      .eq('id', taskId)
    if (error) throw new Error(error.message || 'Failed to delete task')
    return true
  }
}

export const guestService = {
  // Get all guests with enhanced information
  async getGuests() {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Normalize rows for UI safety
    const guestsRaw = (data || [])
    const normalized = guestsRaw.map((g: any) => {
      const address = (typeof g.address === 'object' && g.address?.street_address)
        ? g.address
        : {
          street_address: typeof g.address === 'string' ? g.address : '',
          city: 'PUDUCHERRY',
          postal_code: '605003',
          state: 'Tamil Nadu',
          country: 'India'
        }
      return {
        ...g,
        address,
        total_stays: Number(g.total_stays || 0),
        total_spent: Number(g.total_spent || 0),
        loyalty_points: Number(g.loyalty_points || 0),
        guest_category: g.guest_category || 'regular',
        status: g.status || 'active'
      }
    })

    // Deduplicate by phone (primary) or email (secondary). Keep the most recent record.
    const uniqueMap = new Map<string, any>()
    normalized.forEach((g: any) => {
      const key = (g.phone && String(g.phone).trim())
        || (g.email && String(g.email).toLowerCase().trim())
        || g.id
      const existing = uniqueMap.get(key)
      if (!existing) {
        uniqueMap.set(key, g)
      } else {
        const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime()
        const currentTime = new Date(g.updated_at || g.created_at || 0).getTime()
        if (currentTime >= existingTime) uniqueMap.set(key, g)
      }
    })
    const deduped = Array.from(uniqueMap.values())

    // Fetch latest booking info per guest to populate check-in/out and last amount
    const guestIds = guestsRaw.map((g: any) => g.id).filter(Boolean)
    if (guestIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          guest_id,
          created_at,
          booking_rooms(check_in_date, check_out_date),
          payment_breakdown:booking_payment_breakdown(total_amount)
        `)
        .in('guest_id', guestIds)
        .order('created_at', { ascending: false })

      const byGuest = new Map<string, any>()
        ; (bookings || []).forEach((b: any) => {
          if (!byGuest.has(b.guest_id)) byGuest.set(b.guest_id, b)
        })

      deduped.forEach((g: any) => {
        const lb = byGuest.get(g.id)
        if (lb) {
          const br0 = (lb.booking_rooms && lb.booking_rooms[0]) || null
          g.latest_check_in = br0?.check_in_date || null
          g.latest_check_out = br0?.check_out_date || null
          g.latest_total_amount = Number(lb.payment_breakdown?.total_amount || 0)
        } else {
          g.latest_check_in = null
          g.latest_check_out = null
          g.latest_total_amount = 0
        }
      })
    }

    return deduped as Guest[]
  },

  // Get paginated guests with search capabilities
  async getPaginatedGuests({ page = 1, pageSize = 10, searchQuery = '', sortBy = 'created_at', sortDirection = 'desc' }: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Start building the query
    let query = supabase
      .from("guests")
      .select("*", { count: 'exact' });

    // Add search if provided
    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
      );
    }

    // Add sorting and pagination
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortDirection === 'asc' })
      .range(from, to);

    if (error) throw error;
    // Normalize first
    const normalized = (data || []).map((g: any) => {
      const address = (typeof g.address === 'object' && g.address?.street_address)
        ? g.address
        : {
          street_address: typeof g.address === 'string' ? g.address : '',
          city: 'PUDUCHERRY',
          postal_code: '605003',
          state: 'Tamil Nadu',
          country: 'India'
        }
    return {
        ...g,
        address,
        total_stays: Number(g.total_stays || 0),
        total_spent: Number(g.total_spent || 0),
        loyalty_points: Number(g.loyalty_points || 0),
        guest_category: g.guest_category || 'regular',
        status: g.status || 'active'
      }
    })

    // Deduplicate by phone/email, keep most recent
    const uniqueMap = new Map<string, any>()
    normalized.forEach((g: any) => {
      const key = (g.phone && String(g.phone).trim())
        || (g.email && String(g.email).toLowerCase().trim())
        || g.id
      const existing = uniqueMap.get(key)
      if (!existing) {
        uniqueMap.set(key, g)
      } else {
        const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime()
        const currentTime = new Date(g.updated_at || g.created_at || 0).getTime()
        if (currentTime >= existingTime) uniqueMap.set(key, g)
      }
    })
    const deduped = Array.from(uniqueMap.values())

    // Enrich with latest booking info (dates from booking_rooms, total from booking_payment_breakdown)
    const guestIds = deduped.map((g: any) => g.id)
    if (guestIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          guest_id,
          created_at,
          booking_rooms(check_in_date, check_out_date),
          payment_breakdown:booking_payment_breakdown(total_amount)
        `)
        .in('guest_id', guestIds)
        .order('created_at', { ascending: false })

      const byGuest = new Map<string, any>()
        ; (bookings || []).forEach((b: any) => {
          if (!byGuest.has(b.guest_id)) byGuest.set(b.guest_id, b)
        })

      deduped.forEach((g: any) => {
        const lb = byGuest.get(g.id)
        if (lb) {
          const br0 = (lb.booking_rooms && lb.booking_rooms[0]) || null
          g.latest_check_in = br0?.check_in_date || null
          g.latest_check_out = br0?.check_out_date || null
          g.latest_total_amount = Number(lb.payment_breakdown?.total_amount || 0)
        } else {
          g.latest_check_in = null
          g.latest_check_out = null
          g.latest_total_amount = 0
        }
      })
    }

    // Recompute count based on deduped rows on this page set
    const effectiveCount = deduped.length
    return {
      data: deduped as Guest[],
      count: effectiveCount,
      page,
      pageSize,
      totalPages: Math.ceil(effectiveCount / pageSize)
    };
  },
  // Get guest by ID with all related data
  async getGuestById(id: string) {
    try {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(`Error fetching guest with ID ${id}:`, error);
        throw error;
      }

      // Normalize address structure if needed
      if (data) {
        // Fix address if it's a string, null, undefined or not properly structured
        if (data.address === null || data.address === undefined ||
          (typeof data.address === 'object' && !data.address.street_address)) {
          console.log(`Normalizing address format for guest: ${id}`);

          const originalAddress = typeof data.address === 'string' ? data.address : "";

          data.address = {
            street_address: originalAddress,
            city: "PUDUCHERRY",
            postal_code: "605003",
            state: "Tamil Nadu",
            country: "India"
          };
        }
      }

      return data as Guest;
    } catch (error) {
      console.error(`Error in getGuestById for guest ${id}:`, error);
      throw error;
    }
  },
  // Create new guest profile
  async createGuest(guestData: {
    name: string
    email?: string
    phone?: string
    address?: {
      street_address: string
      city: string
      postal_code: string
      state: string
      country: string
    } | string | null
    id_type?: string
    id_number?: string
    title?: string
    first_name?: string
    last_name?: string
    date_of_birth?: string
    nationality?: string
    passport_number?: string
    company?: string
    designation?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    emergency_contact_relationship?: string
    guest_category?: string
    notes?: string
  }) {
    // Normalize address structure
    if (guestData.address && typeof guestData.address === 'string') {
      guestData.address = {
        street_address: guestData.address,
        city: "PUDUCHERRY",
        postal_code: "605003",
        state: "Tamil Nadu",
        country: "India"
      };
    } else if (!guestData.address) {
      guestData.address = {
        street_address: "",
        city: "PUDUCHERRY",
        postal_code: "605003",
        state: "Tamil Nadu",
        country: "India"
      };
    }
    const { data, error } = await supabase
      .from("guests")
      .insert({
        ...guestData,
        status: "active",
        guest_category: guestData.guest_category || "regular",
        loyalty_points: 0,
        total_stays: 0,
        total_spent: 0
      })
      .select()
      .single()

    if (error) throw error

    // Create loyalty record for new guest
    await supabase
      .from("guest_loyalty")
      .insert({
        guest_id: data.id,
        tier: "bronze",
        points_earned: 0,
        points_redeemed: 0,
        points_expired: 0
      })

    return data as Guest
  },

  // Update guest profile
  async updateGuest(id: string, guestData: Partial<Guest>) {
    // Normalize address if needed
    const payload: any = { ...guestData }
    if (payload.address && typeof payload.address === 'string') {
      payload.address = {
        street_address: payload.address,
        city: 'PUDUCHERRY',
        postal_code: '605003',
        state: 'Tamil Nadu',
        country: 'India'
      }
    }

    const { data, error } = await supabase
      .from("guests")
      .update(payload)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as Guest
  },

  // Upsert guest by phone/email: update if exists, else create
  async upsertGuest(guestData: {
    name: string
    email?: string
    phone?: string
    address?: {
      street_address: string
      city: string
      postal_code: string
      state: string
      country: string
    } | string | null
    id_type?: string
    id_number?: string
    title?: string
    first_name?: string
    last_name?: string
    date_of_birth?: string
    nationality?: string
    passport_number?: string
    company?: string
    designation?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    emergency_contact_relationship?: string
    guest_category?: string
    notes?: string
  }) {
    // Normalize address
    const payload: any = { ...guestData }
    // Ensure display name is set from first/last if missing
    if ((!payload.name || String(payload.name).trim() === '') && (payload.first_name || payload.last_name)) {
      const fn = String(payload.first_name || '').trim()
      const ln = String(payload.last_name || '').trim()
      payload.name = `${fn} ${ln}`.trim()
    }
    if (payload.address && typeof payload.address === 'string') {
      payload.address = {
        street_address: payload.address,
        city: 'PUDUCHERRY',
        postal_code: '605003',
        state: 'Tamil Nadu',
        country: 'India'
      }
    }

    // Try find by phone then email
    let existing: any = null
    if (payload.phone) {
      const { data } = await supabase.from('guests').select('id').eq('phone', payload.phone).maybeSingle()
      existing = data
    }
    if (!existing && payload.email) {
      const { data } = await supabase.from('guests').select('id').eq('email', payload.email).maybeSingle()
      existing = data
    }

    if (existing?.id) {
      const { data, error } = await supabase
        .from('guests')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data as Guest
    }

    // Create new
    return await this.createGuest(payload)
  },

  // Delete guest (soft delete by setting status to inactive)
  async deleteGuest(id: string) {
    const { error } = await supabase
      .from("guests")
      .update({ status: "inactive" })
      .eq("id", id)

    if (error) throw error
  },

  // Search guests by name, email, or phone
  async searchGuests(query: string) {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .eq("status", "active")
      .order("name")

    if (error) throw error
    return data as Guest[]
  },

  // Get guest preferences
  async getGuestPreferences(guestId: string) {
    const { data, error } = await supabase
      .from("guest_preferences")
      .select("*")
      .eq("guest_id", guestId)
      .order("preference_type")
    if (error) return [] as GuestPreference[]
    return (data || []) as GuestPreference[]
  },

  // Add or update guest preference
  async setGuestPreference(guestId: string, preferenceType: string, preferenceValue: string) {
    const { data, error } = await supabase
      .from("guest_preferences")
      .upsert({
        guest_id: guestId,
        preference_type: preferenceType,
        preference_value: preferenceValue
      })
      .select()
      .single()

    if (error) throw error
    return data as GuestPreference
  },

  // Get guest communication history
  async getGuestCommunications(guestId: string) {
    const { data, error } = await supabase
      .from("guest_communications")
      .select(`
        *,
        staff:staff_id(name, email)
      `)
      .eq("guest_id", guestId)
      .order("created_at", { ascending: false })
    if (error) return [] as GuestCommunication[]
    return (data || []) as GuestCommunication[]
  },

  // Add communication record
  async addCommunication(communicationData: {
    guest_id: string
    staff_id?: string
    communication_type: string
    subject?: string
    message: string
    status?: string
    scheduled_at?: string
  }) {
    const { data, error } = await supabase
      .from("guest_communications")
      .insert({
        ...communicationData,
        status: communicationData.status || "sent",
        sent_at: communicationData.status === "sent" ? new Date().toISOString() : null
      })
      .select(`
        *,
        staff:staff_id(name, email)
      `)
      .single()

    if (error) throw error
    return data as GuestCommunication
  },

  // Get guest documents
  async getGuestDocuments(guestId: string) {
    const { data, error } = await supabase
      .from("guest_documents")
      .select(`
        *,
        staff:verified_by(name)
      `)
      .eq("guest_id", guestId)
      .order("created_at", { ascending: false })
    if (error) return [] as GuestDocument[]
    return (data || []) as GuestDocument[]
  },

  // Add guest document
  async addGuestDocument(documentData: {
    guest_id: string
    document_type: string
    document_number?: string
    document_url?: string
    expiry_date?: string
  }) {
    const { data, error } = await supabase
      .from("guest_documents")
      .insert(documentData)
      .select()
      .single()

    if (error) throw error
    return data as GuestDocument
  },

  // Verify guest document
  async verifyDocument(documentId: string, verifiedBy: string) {
    const { data, error } = await supabase
      .from("guest_documents")
      .update({
        is_verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString()
      })
      .eq("id", documentId)
      .select()
      .single()

    if (error) throw error
    return data as GuestDocument
  },

  // Get guest special requests
  async getGuestSpecialRequests(guestId: string) {
    const { data, error } = await supabase
      .from("guest_special_requests")
      .select(`
        *,
        staff:assigned_to(name),
        booking:booking_id(booking_number, check_in, check_out)
      `)
      .eq("guest_id", guestId)
      .order("created_at", { ascending: false })
    if (error) return [] as GuestSpecialRequest[]
    return (data || []) as GuestSpecialRequest[]
  },

  // Add special request
  async addSpecialRequest(requestData: {
    guest_id: string
    booking_id: string
    request_type: string
    request_details: string
    assigned_to?: string
  }) {
    const { data, error } = await supabase
      .from("guest_special_requests")
      .insert({
        ...requestData,
        status: "pending"
      })
      .select()
      .single()

    if (error) throw error
    return data as GuestSpecialRequest
  },

  // Update special request status
  async updateSpecialRequestStatus(requestId: string, status: string, assignedTo?: string) {
    const updateData: any = { status }
    if (assignedTo) updateData.assigned_to = assignedTo
    if (status === "fulfilled") updateData.fulfilled_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("guest_special_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single()

    if (error) throw error
    return data as GuestSpecialRequest
  },

  // Get guest feedback
  async getGuestFeedback(guestId: string) {
    const { data, error } = await supabase
      .from("guest_feedback")
      .select(`
        *,
        booking:booking_id(booking_number, check_in, check_out)
      `)
      .eq("guest_id", guestId)
      .order("created_at", { ascending: false })
    if (error) return [] as GuestFeedback[]
    return (data || []) as GuestFeedback[]
  },

  // Add guest feedback
  async addFeedback(feedbackData: {
    guest_id: string
    booking_id: string
    rating: number
    category?: string
    feedback_text?: string
    is_anonymous?: boolean
  }) {
    const { data, error } = await supabase
      .from("guest_feedback")
      .insert({
        ...feedbackData,
        is_anonymous: feedbackData.is_anonymous || false
      })
      .select()
      .single()

    if (error) throw error
    return data as GuestFeedback
  },

  // Get guest loyalty information
  async getGuestLoyalty(guestId: string) {
    const { data, error } = await supabase
      .from("guest_loyalty")
      .select("*")
      .eq("guest_id", guestId)
      .single()

    if (error) throw error
    return data as GuestLoyalty
  },

  // Add loyalty points
  async addLoyaltyPoints(guestId: string, points: number) {
    // First get current points
    const { data: currentLoyalty, error: fetchError } = await supabase
      .from("guest_loyalty")
      .select("points_earned")
      .eq("guest_id", guestId)
      .single()

    if (fetchError) throw fetchError

    const { data, error } = await supabase
      .from("guest_loyalty")
      .update({
        points_earned: (currentLoyalty.points_earned || 0) + points,
        last_activity_date: new Date().toISOString()
      })
      .eq("guest_id", guestId)
      .select()
      .single()

    if (error) throw error

    // Update loyalty tier
    await supabase.rpc('update_loyalty_tier', { guest_uuid: guestId })

    return data as GuestLoyalty
  },

  // Get guest visit history
  async getGuestVisits(guestId: string) {
    const { data, error } = await supabase
      .from("guest_visits")
      .select(`
        *,
        booking:booking_id(booking_number, room_id),
        room:booking(room:room_id(number, type))
      `)
      .eq("guest_id", guestId)
      .order("check_in_date", { ascending: false })

    if (error) throw error
    return data as GuestVisit[]
  },

  // Get guest statistics
  async getGuestStats(guestId: string) {
    const guest = await this.getGuestById(guestId)
    const loyalty = await this.getGuestLoyalty(guestId)
    const visits = await this.getGuestVisits(guestId)
    const feedback = await this.getGuestFeedback(guestId)

    return {
      guest,
      loyalty,
      totalVisits: visits.length,
      averageRating: feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0,
      lastVisit: visits[0]?.check_out_date || null,
      totalSpent: guest.total_spent || 0,
      loyaltyPoints: loyalty.points_earned - loyalty.points_redeemed - loyalty.points_expired
    }
  },

  // Get repeat guests (guests with multiple stays)
  async getRepeatGuests() {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .gte("total_stays", 2)
      .eq("status", "active")
      .order("total_stays", { ascending: false })

    if (error) throw error
    return data as Guest[]
  },

  // Get VIP guests (high spenders or high loyalty tier)
  async getVIPGuests() {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .or("total_spent.gte.10000,guest_category.eq.vip")
      .eq("status", "active")
      .order("total_spent", { ascending: false })

    if (error) throw error
    return data as Guest[]
  }
}

// New service for booking rooms
export const bookingRoomService = {
  async getBookingRooms(bookingId: string) {
    const { data, error } = await supabase
      .from("booking_rooms")
      .select(`
        *,
        room:room_id(
          number,
          room_type:room_type_id(name, code, base_price)
        )
      `)
      .eq("booking_id", bookingId)
      .order("created_at")

    if (error) throw error
    return data as BookingRoom[]
  },

  async addRoomToBooking(bookingId: string, roomId: string, checkInDate: Date, checkOutDate: Date) {
    const { data, error } = await supabase
      .from("booking_rooms")
      .insert({
        booking_id: bookingId,
        room_id: roomId,
        check_in_date: formatDateForDatabase(checkInDate),
        check_out_date: formatDateForDatabase(checkOutDate),
        room_status: 'reserved'
      })
      .select()
      .single()

    if (error) throw error
    return data as BookingRoom
  },

  async removeRoomFromBooking(bookingRoomId: string) {
    const { error } = await supabase
      .from("booking_rooms")
      .delete()
      .eq("id", bookingRoomId)

    if (error) throw error
    return true
  },

  async updateBookingRoomStatus(bookingRoomId: string, status: 'reserved' | 'checked-in' | 'checked-out' | 'cancelled', actualCheckIn?: Date, actualCheckOut?: Date) {
    const updateData: any = { room_status: status }
    
    if (actualCheckIn) updateData.actual_check_in = actualCheckIn.toISOString()
    if (actualCheckOut) updateData.actual_check_out = actualCheckOut.toISOString()

    const { data, error } = await supabase
      .from("booking_rooms")
      .update(updateData)
      .eq("id", bookingRoomId)
      .select()
      .single()

    if (error) throw error
    return data as BookingRoom
  }
}

// New service for payment transactions
export const paymentService = {
  async getPaymentTransactions(bookingId: string) {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        staff:collected_by(name)
      `)
      .eq("booking_id", bookingId)
      .order("transaction_date", { ascending: false })

    if (error) throw error
    return data as PaymentTransaction[]
  },

  async addPaymentTransaction(transactionData: {
    booking_id: string
    amount: number
    payment_method: 'upi' | 'card' | 'cash' | 'bank'
    transaction_type: 'advance' | 'receipt'
    collected_by?: string
    reference_number?: string
    notes?: string
  }) {
    const { data, error } = await supabase
      .from("payment_transactions")
      .insert(transactionData)
      .select()
      .single()

    if (error) throw error
    return data as PaymentTransaction
  },

  async getPaymentBreakdown(bookingId: string) {
    const { data, error } = await supabase
      .from("booking_payment_breakdown")
      .select("*")
      .eq("booking_id", bookingId)
      .single()

    if (error) throw error
    return data as BookingPaymentBreakdown
  }
}

// New service for cancelled bookings
export const cancellationService = {
  async getCancelledBookings(fromDate?: Date, toDate?: Date) {
    let query = supabase
      .from("cancelled_bookings")
      .select(`
        *,
        booking:booking_id(
          booking_number,
          guest:guest_id(name, phone),
          staff:staff_id(name)
        ),
        cancelled_by_staff:staff(name)
      `)
      .order("cancel_date", { ascending: false })

    if (fromDate) {
      query = query.gte("cancel_date", fromDate.toISOString())
    }
    if (toDate) {
      query = query.lte("cancel_date", toDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return data as CancelledBooking[]
  },

  async cancelBooking(bookingId: string, cancellationData: {
    cancellation_reason: string
    cancelled_by_staff_id?: string
    refund_amount?: number
    notes?: string
  }) {
    const { data, error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_cancellation_reason: cancellationData.cancellation_reason,
      p_cancelled_by_staff_id: cancellationData.cancelled_by_staff_id,
      p_refund_amount: cancellationData.refund_amount || 0,
      p_notes: cancellationData.notes
    })

    if (error) throw error
    return data
  },

  async getCancellationStats(fromDate?: Date, toDate?: Date) {
    const { data, error } = await supabase.rpc('get_cancellation_stats', {
      p_from_date: fromDate?.toISOString().split('T')[0],
      p_to_date: toDate?.toISOString().split('T')[0]
    })

    if (error) throw error
    return data
  }
}

// New service for blocked rooms
export const blockedRoomService = {
  async getBlockedRooms(fromDate?: Date, toDate?: Date) {
    let query = supabase
      .from("blocked_rooms")
      .select(`
        *,
        room:room_id(number, room_type:room_type_id(name)),
        blocked_by_staff:staff(name),
        unblocked_by_staff:staff(name)
      `)
      .order("blocked_date", { ascending: false })

    if (fromDate) {
      query = query.gte("blocked_date", fromDate.toISOString())
    }
    if (toDate) {
      query = query.lte("blocked_date", toDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return data as BlockedRoom[]
  },

  async blockRoom(blockData: {
    room_id: string
    blocked_by_staff_id: string
    blocked_from_date: Date
    blocked_to_date: Date
    reason: string
    notes?: string
  }) {
    const { data, error } = await supabase.rpc('block_room', {
      p_room_id: blockData.room_id,
      p_blocked_by_staff_id: blockData.blocked_by_staff_id,
      p_blocked_from_date: blockData.blocked_from_date.toISOString().split('T')[0],
      p_blocked_to_date: blockData.blocked_to_date.toISOString().split('T')[0],
      p_reason: blockData.reason,
      p_notes: blockData.notes
    })

    if (error) throw error
    return data
  },

  async unblockRoom(blockedRoomId: string, unblockData: {
    unblocked_by_staff_id: string
    unblock_reason?: string
  }) {
    const { error } = await supabase.rpc('unblock_room', {
      p_blocked_room_id: blockedRoomId,
      p_unblocked_by_staff_id: unblockData.unblocked_by_staff_id,
      p_unblock_reason: unblockData.unblock_reason
    })

    if (error) throw error
    return true
  },

  async getBlockedRoomStats(fromDate?: Date, toDate?: Date) {
    const { data, error } = await supabase.rpc('get_blocked_room_stats', {
      p_from_date: fromDate?.toISOString().split('T')[0],
      p_to_date: toDate?.toISOString().split('T')[0]
    })

    if (error) throw error
    return data
  }
}
