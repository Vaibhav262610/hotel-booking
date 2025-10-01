import { useState, useEffect } from "react"
import { roomService, bookingService, housekeepingService, staffService } from "@/lib/supabase"
import { DashboardStats, Room, Staff, Booking } from "../types"

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    occupiedRooms: 0,
    totalRooms: 0,
    checkInsToday: 0,
    pendingHousekeeping: 0,
    availableRooms: 0,
  })
  const [rooms, setRooms] = useState<Room[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setError(null)
        const [roomStats, bookingStats, taskStats, roomsData, staffData, bookingsData] = await Promise.all([
          roomService.getRoomStats(),
          bookingService.getBookingStats(),
          housekeepingService.getTaskStats(),
          roomService.getRooms(),
          staffService.getStaff(),
          bookingService.getBookings(),
        ])

        setStats({
          totalRevenue: bookingStats.totalRevenue,
          occupiedRooms: roomStats.occupied,
          totalRooms: roomStats.total,
          checkInsToday: bookingStats.checkInsToday,
          pendingHousekeeping: taskStats.pending,
          availableRooms: roomStats.available,
        })

        setRooms(roomsData)
        setStaff(staffData)
        setBookings(bookingsData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return {
    stats,
    rooms,
    staff,
    bookings,
    loading,
    error,
    refetch: () => window.location.reload()
  }
}
