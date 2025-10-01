import { supabase } from "./supabase"
import { formatDateForDatabase, doDatesOverlap } from "./date-utils"

export interface RoomMaintenance {
  id: string
  room_id: string
  type: "repair" | "renovation" | "cleaning" | "inspection"
  description: string
  start_date: string
  end_date: string
  status: "scheduled" | "in-progress" | "completed" | "cancelled"
  assigned_to: string
  estimated_cost: number
  actual_cost?: number
  notes: string
  created_at: string
  updated_at: string
}

export interface GuestPreference {
  id: string
  guest_id: string
  room_type: string
  floor_preference: string
  amenities: string[]
  special_requests: string
  created_at: string
  updated_at: string
}

export interface RoomInventory {
  id: string
  room_id: string
  item_name: string
  quantity: number
  min_quantity: number
  last_restocked: string
  notes: string
  created_at: string
  updated_at: string
}

export const hotelOperationsService = {
  // Room Maintenance Management
  async createMaintenanceRequest(maintenanceData: {
    roomId: string
    type: "repair" | "renovation" | "cleaning" | "inspection"
    description: string
    startDate: Date
    endDate: Date
    assignedTo: string
    estimatedCost: number
    notes?: string
  }) {
    const { data, error } = await supabase
      .from("room_maintenance")
      .insert({
        room_id: maintenanceData.roomId,
        type: maintenanceData.type,
        description: maintenanceData.description,
        start_date: formatDateForDatabase(maintenanceData.startDate),
        end_date: formatDateForDatabase(maintenanceData.endDate),
        status: "scheduled",
        assigned_to: maintenanceData.assignedTo,
        estimated_cost: maintenanceData.estimatedCost,
        notes: maintenanceData.notes || ""
      })
      .select()
      .single()

    if (error) throw error

    // Update room status to maintenance
    await supabase
      .from("rooms")
      .update({ status: "maintenance" })
      .eq("id", maintenanceData.roomId)

    return data as RoomMaintenance
  },

  async updateMaintenanceStatus(maintenanceId: string, status: string, actualCost?: number) {
    const { data, error } = await supabase
      .from("room_maintenance")
      .update({
        status,
        actual_cost: actualCost,
        updated_at: new Date().toISOString()
      })
      .eq("id", maintenanceId)
      .select()
      .single()

    if (error) throw error

    // If maintenance is completed, update room status to available
    if (status === "completed") {
      await supabase
        .from("rooms")
        .update({ status: "available" })
        .eq("id", data.room_id)
    }

    return data as RoomMaintenance
  },

  async getMaintenanceRequests(roomId?: string) {
    let query = supabase
      .from("room_maintenance")
      .select(`
        *,
        room:rooms(number, type),
        staff:staff(name)
      `)
      .order("created_at", { ascending: false })

    if (roomId) {
      query = query.eq("room_id", roomId)
    }

    const { data, error } = await query

    if (error) throw error
    return data as RoomMaintenance[]
  },

  // Guest Preferences Management
  async saveGuestPreference(preferenceData: {
    guestId: string
    roomType: string
    floorPreference: string
    amenities: string[]
    specialRequests?: string
  }) {
    const { data, error } = await supabase
      .from("guest_preferences")
      .upsert({
        guest_id: preferenceData.guestId,
        room_type: preferenceData.roomType,
        floor_preference: preferenceData.floorPreference,
        amenities: preferenceData.amenities,
        special_requests: preferenceData.specialRequests || ""
      })
      .select()
      .single()

    if (error) throw error
    return data as GuestPreference
  },

  async getGuestPreferences(guestId: string) {
    const { data, error } = await supabase
      .from("guest_preferences")
      .select("*")
      .eq("guest_id", guestId)
      .single()

    if (error && error.code !== "PGRST116") throw error // PGRST116 = no rows returned
    return data as GuestPreference | null
  },

  // Room Inventory Management
  async updateRoomInventory(inventoryData: {
    roomId: string
    itemName: string
    quantity: number
    minQuantity: number
    notes?: string
  }) {
    const { data, error } = await supabase
      .from("room_inventory")
      .upsert({
        room_id: inventoryData.roomId,
        item_name: inventoryData.itemName,
        quantity: inventoryData.quantity,
        min_quantity: inventoryData.minQuantity,
        last_restocked: new Date().toISOString(),
        notes: inventoryData.notes || ""
      })
      .select()
      .single()

    if (error) throw error
    return data as RoomInventory
  },

  async getRoomInventory(roomId: string) {
    const { data, error } = await supabase
      .from("room_inventory")
      .select("*")
      .eq("room_id", roomId)
      .order("item_name")

    if (error) throw error
    return data as RoomInventory[]
  },

  // Advanced Room Operations
  async getRoomAnalytics(roomId: string, startDate: Date, endDate: Date) {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("check_in, check_out, total_amount, status")
      .eq("room_id", roomId)
      .gte("check_in", formatDateForDatabase(startDate))
      .lte("check_out", formatDateForDatabase(endDate))

    if (error) throw error

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const occupiedDays = bookings.reduce((days, booking) => {
      const checkIn = new Date(booking.check_in)
      const checkOut = new Date(booking.check_out)
      return days + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    }, 0)

    return {
      totalDays,
      occupiedDays,
      occupancyRate: totalDays > 0 ? (occupiedDays / totalDays) * 100 : 0,
      totalRevenue: bookings.reduce((sum, booking) => sum + booking.total_amount, 0),
      averageDailyRate: occupiedDays > 0 ? 
        bookings.reduce((sum, booking) => sum + booking.total_amount, 0) / occupiedDays : 0,
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === "checked-out").length
    }
  },

  async getHotelOccupancyReport(startDate: Date, endDate: Date) {
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id, number, type, price")

    if (roomsError) throw roomsError

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("room_id, check_in, check_out, total_amount, status")
      .gte("check_in", formatDateForDatabase(startDate))
      .lte("check_out", formatDateForDatabase(endDate))

    if (bookingsError) throw bookingsError

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalRooms = rooms.length

    const roomAnalytics = rooms.map(room => {
      const roomBookings = bookings.filter(b => b.room_id === room.id)
      const occupiedDays = roomBookings.reduce((days, booking) => {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)
        return days + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      }, 0)

      return {
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        price: room.price,
        occupiedDays,
        occupancyRate: totalDays > 0 ? (occupiedDays / totalDays) * 100 : 0,
        revenue: roomBookings.reduce((sum, booking) => sum + booking.total_amount, 0),
        bookings: roomBookings.length
      }
    })

    const totalOccupiedDays = roomAnalytics.reduce((sum, room) => sum + room.occupiedDays, 0)
    const totalRevenue = roomAnalytics.reduce((sum, room) => sum + room.revenue, 0)
    const totalBookings = roomAnalytics.reduce((sum, room) => sum + room.bookings, 0)

    return {
      period: {
        startDate: formatDateForDatabase(startDate),
        endDate: formatDateForDatabase(endDate),
        totalDays
      },
      summary: {
        totalRooms,
        totalOccupiedDays,
        overallOccupancyRate: totalDays > 0 ? (totalOccupiedDays / (totalRooms * totalDays)) * 100 : 0,
        totalRevenue,
        totalBookings,
        averageDailyRate: totalOccupiedDays > 0 ? totalRevenue / totalOccupiedDays : 0
      },
      roomDetails: roomAnalytics
    }
  },

  // Housekeeping Operations
  async createHousekeepingSchedule(roomId: string, assignedTo: string, scheduledDate: Date, type: string) {
    const { data, error } = await supabase
      .from("housekeeping_tasks")
      .insert({
        hotel_id: "550e8400-e29b-41d4-a716-446655440000",
        room_id: roomId,
        assigned_to: assignedTo,
        type,
        status: "scheduled",
        priority: "normal",
        estimated_time: 60, // Default 1 hour
        notes: `Scheduled ${type} for ${formatDateForDatabase(scheduledDate)}`
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getHousekeepingSchedule(date: Date) {
    const { data, error } = await supabase
      .from("housekeeping_tasks")
      .select(`
        *,
        room:rooms(number, type),
        staff:staff(name)
      `)
      .gte("created_at", formatDateForDatabase(date))
      .lt("created_at", formatDateForDatabase(new Date(date.getTime() + 24 * 60 * 60 * 1000)))
      .order("priority", { ascending: false })

    if (error) throw error
    return data
  }
} 