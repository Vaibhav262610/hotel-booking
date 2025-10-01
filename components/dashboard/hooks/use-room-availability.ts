import { useCallback, useState } from "react"
import { bookingService } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { RoomAvailability } from "../types"

export function useRoomAvailability() {
  const [quickCheckInRoomAvailability, setQuickCheckInRoomAvailability] = useState<RoomAvailability | null>(null)
  const [newBookingRoomAvailability, setNewBookingRoomAvailability] = useState<RoomAvailability | null>(null)
  const { toast } = useToast()

  const checkRoomAvailability = useCallback(async (roomId: string, checkIn: Date, checkOut: Date, type: 'quickCheckIn' | 'newBooking') => {
    const setAvailabilityState = type === 'quickCheckIn' ? setQuickCheckInRoomAvailability : setNewBookingRoomAvailability
    
    setAvailabilityState({ available: false, message: "", checking: true })

    try {
      const availability = await bookingService.checkRoomAvailability(roomId, checkIn, checkOut)

      setAvailabilityState({
        available: availability.available,
        message: availability.message || "",
        checking: false
      })

      if (availability.available) {
        toast({
          title: "Room Available",
          description: "The selected room is available for the chosen dates.",
          variant: "default",
        })
      } else {
        toast({
          title: "Room Not Available",
          description: availability.message || "The selected room is not available for the chosen dates.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error checking room availability:", error)
      setAvailabilityState({
        available: false,
        message: "Unable to check room availability",
        checking: false
      })
      toast({
        title: "Error",
        description: "Unable to check room availability. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  return {
    quickCheckInRoomAvailability,
    newBookingRoomAvailability,
    checkRoomAvailability
  }
}
