"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarIcon, Search, Users, Bed, CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { bookingService, reservationService, staffService, supabase } from "@/lib/supabase"
import { Booking, Staff, Room } from "../types"

interface RoomCheckInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onSuccess: () => void
}

export function RoomCheckInDialog({ open, onOpenChange, room, onSuccess }: RoomCheckInDialogProps) {
  const [activeTab, setActiveTab] = useState<"bookings" | "reservations">("bookings")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkInNotes, setCheckInNotes] = useState("")
  const [actualCheckIn, setActualCheckIn] = useState<Date>(new Date())
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [showManualCheckIn, setShowManualCheckIn] = useState(false)
  const [manualGuestName, setManualGuestName] = useState("")
  const [manualGuestPhone, setManualGuestPhone] = useState("")
  const [manualGuestEmail, setManualGuestEmail] = useState("")
  const { toast } = useToast()

  // Load data when dialog opens
  useEffect(() => {
    if (open && room) {
      loadData()
    }
  }, [open, room])

  const loadData = async () => {
    if (!room) return

    try {
      setIsLoading(true)
      console.log("Loading data for room:", room.id, room.number)
      
      // Initialize with empty arrays to prevent undefined errors
      let bookingsData: Booking[] = []
      let reservationsData: any[] = []
      let staffData: Staff[] = []

      // Try to load bookings with fallback
      try {
        console.log("Fetching bookings...")
        bookingsData = await bookingService.getBookings()
        console.log("Bookings loaded:", bookingsData?.length || 0)
      } catch (error) {
        console.error("Error fetching bookings:", error)
        // Don't throw error, just log and continue with empty array
        bookingsData = []
        toast({
          title: "Warning",
          description: "Could not load bookings. You can still check in manually.",
          variant: "destructive",
        })
      }

      // Try to load reservations with fallback
      try {
        console.log("Fetching reservations...")
        reservationsData = await reservationService.getReservations()
        console.log("Reservations loaded:", reservationsData?.length || 0)
      } catch (error) {
        console.error("Error fetching reservations:", error)
        // Don't throw error, just log and continue with empty array
        reservationsData = []
        toast({
          title: "Warning",
          description: "Could not load reservations. You can still check in manually.",
          variant: "destructive",
        })
      }

      // Try to load staff with fallback
      try {
        console.log("Fetching staff...")
        staffData = await staffService.getStaff()
        console.log("Staff loaded:", staffData?.length || 0)
      } catch (error) {
        console.error("Error fetching staff:", error)
        // Don't throw error, just log and continue with empty array
        staffData = []
        toast({
          title: "Warning",
          description: "Could not load staff list. Please ensure staff data is available.",
          variant: "destructive",
        })
      }

      // Ensure we have arrays to work with
      if (!Array.isArray(bookingsData)) bookingsData = []
      if (!Array.isArray(reservationsData)) reservationsData = []
      if (!Array.isArray(staffData)) staffData = []

      // Filter bookings and reservations for this specific room
      console.log("Filtering data for room:", room.id)
      const roomBookings = bookingsData.filter(booking => {
        if (!booking) return false
        
        const hasRoomInBookingRooms = booking.booking_rooms?.some(br => br?.room_id === room.id)
        const hasRoomInDirectRoom = booking.room?.id === room.id
        const isCorrectStatus = booking.status === 'confirmed' || booking.status === 'pending'
        
        console.log(`Booking ${booking.id}: hasRoomInBookingRooms=${hasRoomInBookingRooms}, hasRoomInDirectRoom=${hasRoomInDirectRoom}, status=${booking.status}, isCorrectStatus=${isCorrectStatus}`)
        
        return (hasRoomInBookingRooms || hasRoomInDirectRoom) && isCorrectStatus
      })

      const roomReservations = reservationsData.filter(reservation => {
        if (!reservation) return false
        
        const hasCorrectRoom = reservation.room_id === room.id
        const isCorrectStatus = reservation.status === 'confirmed' || reservation.status === 'pending'
        
        console.log(`Reservation ${reservation.id}: room_id=${reservation.room_id}, target_room_id=${room.id}, hasCorrectRoom=${hasCorrectRoom}, status=${reservation.status}, isCorrectStatus=${isCorrectStatus}`)
        
        return hasCorrectRoom && isCorrectStatus
      })

      console.log("Filtered results:", { roomBookings: roomBookings.length, roomReservations: roomReservations.length })

      setBookings(roomBookings)
      setReservations(roomReservations)
      setStaff(staffData)

      // Show success message if we loaded some data
      if (roomBookings.length > 0 || roomReservations.length > 0) {
        toast({
          title: "Data Loaded",
          description: `Found ${roomBookings.length} bookings and ${roomReservations.length} reservations for this room.`,
        })
      } else {
        toast({
          title: "No Data Found",
          description: "No bookings or reservations found for this room. You can create a new booking or reservation.",
        })
      }
    } catch (error) {
      console.error("Unexpected error loading data:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again or contact support.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      booking.booking_number?.toLowerCase().includes(query) ||
      booking.guest?.name?.toLowerCase().includes(query) ||
      booking.guest?.phone?.includes(query)
    )
  })

  const filteredReservations = reservations.filter(reservation => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      reservation.reservation_number?.toLowerCase().includes(query) ||
      reservation.guest?.name?.toLowerCase().includes(query) ||
      reservation.guest?.phone?.includes(query)
    )
  })

  const handleBookingSelect = (booking: Booking) => {
    setSelectedBooking(booking)
    setSelectedReservation(null)
    setSelectedStaffId(booking.staff_id)
  }

  const handleReservationSelect = (reservation: any) => {
    setSelectedReservation(reservation)
    setSelectedBooking(null)
    setSelectedStaffId(reservation.staff_id)
  }

  const handleCheckIn = async () => {
    if (!selectedBooking && !selectedReservation && !showManualCheckIn) {
      toast({
        title: "Selection Required",
        description: "Please select a booking, reservation, or use manual check-in.",
        variant: "destructive",
      })
      return
    }

    if (!selectedStaffId) {
      toast({
        title: "Staff Required",
        description: "Please select a staff member for the check-in.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      if (selectedBooking) {
        await bookingService.checkIn(selectedBooking.id, {
          actualCheckIn: actualCheckIn,
          checkInNotes: checkInNotes,
          staffId: selectedStaffId,
        })

        toast({
          title: "Success",
          description: `Booking ${selectedBooking.booking_number} checked in successfully!`,
        })
      } else if (selectedReservation) {
        // For reservations, we need to create a simple check-in method
        await reservationService.checkInReservation(selectedReservation.id, {
          actualCheckIn: actualCheckIn,
          checkInNotes: checkInNotes,
          staffId: selectedStaffId,
        })

        toast({
          title: "Success",
          description: `Reservation ${selectedReservation.reservation_number} checked in successfully!`,
        })
      } else if (showManualCheckIn) {
        // Manual check-in: create a simple booking and check it in
        if (!manualGuestName || !manualGuestPhone) {
          toast({
            title: "Guest Information Required",
            description: "Please provide guest name and phone number for manual check-in.",
            variant: "destructive",
          })
          return
        }

        // Create a simple booking for manual check-in
        const { data: guest, error: guestError } = await supabase
          .from("guests")
          .insert({
            name: manualGuestName,
            phone: manualGuestPhone,
            email: manualGuestEmail || null,
            first_name: manualGuestName.split(' ')[0],
            last_name: manualGuestName.split(' ').slice(1).join(' ') || '',
          })
          .select()
          .single()

        if (guestError) throw guestError

        // Create a simple booking
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            guest_id: guest.id,
            staff_id: selectedStaffId,
            check_in: new Date().toISOString().split('T')[0],
            expected_checkout: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
            status: "checked-in",
            actual_check_in: actualCheckIn.toISOString(),
            check_in_notes: checkInNotes,
            number_of_guests: 1,
            total_pax: 1,
            arrival_type: "walk_in",
            hotel_id: "1", // Default hotel ID - you might want to get this from context
          })
          .select()
          .single()

        if (bookingError) throw bookingError

        // Create booking_rooms entry
        const { error: bookingRoomError } = await supabase
          .from("booking_rooms")
          .insert({
            booking_id: booking.id,
            room_id: room!.id,
            check_in_date: new Date().toISOString().split('T')[0],
            check_out_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            actual_check_in: actualCheckIn.toISOString(),
            room_status: "checked_in",
          })

        if (bookingRoomError) throw bookingRoomError

        // Update room status
        const { error: roomError } = await supabase
          .from("rooms")
          .update({ status: "occupied" })
          .eq("id", room!.id)

        if (roomError) throw roomError

        toast({
          title: "Success",
          description: `Guest ${manualGuestName} checked in successfully!`,
        })
      }

      // Reset form and refresh data
      setSelectedBooking(null)
      setSelectedReservation(null)
      setCheckInNotes("")
      setActualCheckIn(new Date())
      setSelectedStaffId("")
      setShowManualCheckIn(false)
      setManualGuestName("")
      setManualGuestPhone("")
      setManualGuestEmail("")
      await loadData()
      onSuccess()
    } catch (error) {
      console.error("Check-in error:", error)
      toast({
        title: "Check-in Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during check-in.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedBooking(null)
    setSelectedReservation(null)
    setCheckInNotes("")
    setActualCheckIn(new Date())
    setSelectedStaffId("")
    setSearchQuery("")
    setShowManualCheckIn(false)
    setManualGuestName("")
    setManualGuestPhone("")
    setManualGuestEmail("")
  }

  const currentSelection = selectedBooking || selectedReservation
  const isBooking = !!selectedBooking

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForm()
    }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" data-theme="light">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Check-in Guest - Room {room?.number}
          </DialogTitle>
          <DialogDescription>
            Select and check in an existing booking or reservation for this room
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Info */}
          {room && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Room {room.number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {room.room_type?.name || ''} • 
                      ₹{room.room_type?.base_price || room.price || 0}/night
                    </p>
                  </div>
                  <Badge variant="secondary" className={cn(
                    "text-white",
                    room.status === 'available' && "bg-green-500",
                    room.status === 'occupied' && "bg-red-500",
                    room.status === 'reserved' && "bg-yellow-500",
                    room.status === 'blocked' && "bg-purple-500"
                  )}>
                    {room.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by booking/reservation number, guest name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs for Bookings and Reservations */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "bookings" | "reservations")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bookings">Bookings ({filteredBookings.length})</TabsTrigger>
              <TabsTrigger value="reservations">Reservations ({filteredReservations.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading bookings...</span>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bookings found for this room</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-60 overflow-y-auto">
                  {filteredBookings.map((booking) => (
                    <Card
                      key={booking.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedBooking?.id === booking.id
                          ? "ring-2 ring-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleBookingSelect(booking)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{booking.booking_number}</span>
                              <Badge variant="secondary">{booking.status}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {booking.guest?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bed className="h-3 w-3" />
                                  {booking.booking_rooms?.map(br => br.room?.number).join(', ')}
                                </span>
                              </div>
                              <div className="text-xs">
                                Check-in: {format(new Date(booking.check_in), "MMM dd, yyyy")} | 
                                Check-out: {format(new Date(booking.expected_checkout), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              ₹{booking.payment_breakdown?.taxed_total_amount?.toFixed(2) || booking.payment_breakdown?.total_amount?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.booking_rooms?.length || 0} room(s)
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reservations" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading reservations...</span>
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reservations found for this room</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-60 overflow-y-auto">
                  {filteredReservations.map((reservation) => (
                    <Card
                      key={reservation.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedReservation?.id === reservation.id
                          ? "ring-2 ring-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleReservationSelect(reservation)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{reservation.reservation_number}</span>
                              <Badge variant="secondary">{reservation.status}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {reservation.guest?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bed className="h-3 w-3" />
                                  {reservation.room?.number}
                                </span>
                              </div>
                              <div className="text-xs">
                                Check-in: {format(new Date(reservation.check_in), "MMM dd, yyyy")} | 
                                Check-out: {format(new Date(reservation.check_out), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              ₹{reservation.total_amount?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Single room
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Manual Check-in Option */}
          {filteredBookings.length === 0 && filteredReservations.length === 0 && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manual Check-in
                </CardTitle>
                <CardDescription>
                  No existing bookings or reservations found. You can check in a guest manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="manual-checkin"
                    checked={showManualCheckIn}
                    onChange={(e) => setShowManualCheckIn(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="manual-checkin">Enable manual check-in</Label>
                </div>

                {showManualCheckIn && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Guest Name *</Label>
                        <Input
                          placeholder="Enter guest name"
                          value={manualGuestName}
                          onChange={(e) => setManualGuestName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number *</Label>
                        <Input
                          placeholder="Enter phone number"
                          value={manualGuestPhone}
                          onChange={(e) => setManualGuestPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email (Optional)</Label>
                      <Input
                        placeholder="Enter email address"
                        value={manualGuestEmail}
                        onChange={(e) => setManualGuestEmail(e.target.value)}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>This will create a new booking and check the guest in immediately.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Check-in Details */}
          {(currentSelection || showManualCheckIn) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Check-in Details - {showManualCheckIn ? 'Manual Check-in' : (isBooking ? selectedBooking?.booking_number : selectedReservation?.reservation_number)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Guest Name</Label>
                    <Input 
                      value={showManualCheckIn ? manualGuestName : (currentSelection?.guest?.name || '')} 
                      disabled={!showManualCheckIn}
                      onChange={showManualCheckIn ? (e) => setManualGuestName(e.target.value) : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={showManualCheckIn ? manualGuestPhone : (currentSelection?.guest?.phone || '')} 
                      disabled={!showManualCheckIn}
                      onChange={showManualCheckIn ? (e) => setManualGuestPhone(e.target.value) : undefined}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Room(s)</Label>
                    <Input 
                      value={
                        showManualCheckIn 
                          ? room?.number || ''
                          : (isBooking 
                              ? selectedBooking?.booking_rooms?.map(br => br.room?.number).join(', ') || ''
                              : selectedReservation?.room?.number || '')
                      } 
                      disabled 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Staff Member *</Label>
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Actual Check-in Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !actualCheckIn && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {actualCheckIn ? format(actualCheckIn, "PPP p") : <span>Pick a date and time</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={actualCheckIn} onSelect={(date) => date && setActualCheckIn(date)} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Check-in Notes</Label>
                  <Textarea
                    placeholder="Any special notes for this check-in..."
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCheckIn} 
            disabled={!currentSelection || !selectedStaffId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking in...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Check In
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
