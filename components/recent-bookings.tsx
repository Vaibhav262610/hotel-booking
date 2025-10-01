"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Edit, LogOut, AlertTriangle, Info, Users, Calendar, CreditCard } from "lucide-react"
import { bookingService, type Booking, type BookingRoom } from "@/lib/supabase"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

const statusConfig = {
  pending: { variant: "destructive" as const, label: "Pending" },
  confirmed: { variant: "default" as const, label: "Confirmed" },
  checked_in: { variant: "secondary" as const, label: "Checked In" },
  checked_out: { variant: "outline" as const, label: "Checked Out" },
  cancelled: { variant: "destructive" as const, label: "Cancelled" },
}

export function RecentBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewBooking, setViewBooking] = useState<Booking | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isRoomsDialogOpen, setIsRoomsDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchBookings() {
      try {
        setError(null)
        const data = await bookingService.getBookings()
        setBookings(data.slice(0, 5))
      } catch (error) {
        console.error("Error fetching bookings:", error)
        setError("Failed to load bookings")
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const safeFormat = (dateStr?: string | null) => {
    if (!dateStr) return "N/A"
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? "N/A" : format(d, "MMM dd, yyyy")
  }

  const getStatusVariant = (status: string) => {
    return (statusConfig as any)[status]?.variant || "outline"
  }

  const getStatusLabel = (status: string) => {
    return (statusConfig as any)[status]?.label || status
  }

  const getCombinedStatus = (booking: Booking) => {
    if (!booking.booking_rooms || booking.booking_rooms.length === 0) {
      return booking.status
    }
    
    const statuses = booking.booking_rooms.map(room => room.room_status)
    const uniqueStatuses = [...new Set(statuses)]
    
    // Priority order: checked_in > checked_out > reserved > cancelled
    if (uniqueStatuses.includes('checked_in')) return 'checked_in'
    if (uniqueStatuses.includes('checked_out')) return 'checked_out'
    if (uniqueStatuses.includes('reserved')) return 'reserved'
    if (uniqueStatuses.includes('cancelled')) return 'cancelled'
    
    return booking.status
  }

  const getRoomDisplayText = (booking: Booking) => {
    if (!booking.booking_rooms || booking.booking_rooms.length === 0) {
      return "N/A"
    }
    
    if (booking.booking_rooms.length === 1) {
      return booking.booking_rooms[0].room?.number || "N/A"
    }
    
    const primaryRoom = booking.booking_rooms[0]
    const additionalCount = booking.booking_rooms.length - 1
    return `${primaryRoom.room?.number || "N/A"} + ${additionalCount} more`
  }

  const getTotalAmount = (booking: Booking) => {
    if (booking.payment_breakdown?.total_amount) {
      return booking.payment_breakdown.total_amount
    }
    
    // Fallback: calculate from booking_rooms
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      return booking.booking_rooms.reduce((sum, room) => sum + (room.room_total || 0), 0)
    }
    
    return 0
  }

  const openView = (booking: Booking) => {
    setViewBooking(booking)
    setIsViewOpen(true)
  }

  const openRoomsDialog = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsRoomsDialogOpen(true)
  }

  const openStatusDialog = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsStatusDialogOpen(true)
  }

  const goToEdit = (booking: Booking) => {
    router.push(`/bookings?bookingId=${booking.id}`)
  }

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading bookings...</div>
  }

  if (error) {
    return <div className="text-center py-4 text-red-600">{error}</div>
  }

  if (bookings.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No bookings found</div>
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-foreground">Booking ID</TableHead>
            <TableHead className="text-foreground">Guest</TableHead>
            <TableHead className="text-foreground">Room</TableHead>
            <TableHead className="text-foreground">Check-in</TableHead>
            <TableHead className="text-foreground">Check-out</TableHead>
            <TableHead className="text-foreground">Status</TableHead>
            <TableHead className="text-foreground">Amount</TableHead>
            <TableHead className="text-foreground">Staff</TableHead>
            <TableHead className="text-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium text-foreground">{booking.booking_number}</TableCell>
              <TableCell className="text-foreground">{booking.guest?.name || "Unknown Guest"}</TableCell>
              <TableCell className="text-foreground">
                <div className="flex items-center gap-2">
                  <span>{getRoomDisplayText(booking)}</span>
                  {booking.booking_rooms && booking.booking_rooms.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRoomsDialog(booking)}
                      className="h-6 px-2 text-xs"
                    >
                      <Info className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-foreground">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Planned:</span>
                  <span>{safeFormat(booking.check_in)}</span>
                  {booking.actual_check_in && (
                    <>
                      <span className="text-xs text-muted-foreground mt-1">Actual:</span>
                      <span className="text-green-600">{safeFormat(booking.actual_check_in)}</span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-foreground">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Planned:</span>
                  <span>{safeFormat(booking.expected_checkout)}</span>
                  {booking.actual_check_out && (
                    <>
                      <span className="text-xs text-muted-foreground mt-1">Actual:</span>
                      <span className="text-green-600">{safeFormat(booking.actual_check_out)}</span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(getCombinedStatus(booking))}>
                    {getStatusLabel(getCombinedStatus(booking))}
                  </Badge>
                  {booking.booking_rooms && booking.booking_rooms.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openStatusDialog(booking)}
                      className="h-6 px-2 text-xs"
                    >
                      <Users className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-foreground">₹{Number(getTotalAmount(booking)).toLocaleString()}</TableCell>
              <TableCell className="text-foreground">{booking.staff?.name || "N/A"}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openView(booking)} aria-label="View booking">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => goToEdit(booking)} aria-label="Edit booking">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {viewBooking && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>Summary for booking {viewBooking.booking_number}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Guest</span><span>{viewBooking.guest?.name || "Unknown"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rooms</span><span>{getRoomDisplayText(viewBooking)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{getStatusLabel(getCombinedStatus(viewBooking))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Planned Check-in</span><span>{safeFormat(viewBooking.check_in)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actual Check-in</span><span>{safeFormat(viewBooking.actual_check_in)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Planned Check-out</span><span>{safeFormat(viewBooking.expected_checkout)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actual Check-out</span><span>{safeFormat(viewBooking.actual_check_out)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span>₹{Number(getTotalAmount(viewBooking)).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span>{viewBooking.staff?.name || "N/A"}</span></div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Rooms Details Dialog */}
      {selectedBooking && (
        <Dialog open={isRoomsDialogOpen} onOpenChange={setIsRoomsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Room Details</DialogTitle>
              <DialogDescription>
                All rooms for booking {selectedBooking.booking_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedBooking.booking_rooms?.map((room, index) => (
                <div key={room.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">Room {room.room?.number || "N/A"}</h4>
                      <p className="text-sm text-muted-foreground">
                        {room.room?.room_type?.name || "Standard Room"}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(room.room_status)}>
                      {getStatusLabel(room.room_status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Check-in:</span>
                      <div className="font-medium">{safeFormat(room.check_in_date)}</div>
                      {room.actual_check_in && (
                        <div className="text-green-600 text-xs">
                          Actual: {safeFormat(room.actual_check_in)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-out:</span>
                      <div className="font-medium">{safeFormat(room.check_out_date)}</div>
                      {room.actual_check_out && (
                        <div className="text-green-600 text-xs">
                          Actual: {safeFormat(room.actual_check_out)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Room Rate:</span>
                      <div className="font-medium">₹{Number(room.room_rate || 0).toLocaleString()}/night</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Room Total:</span>
                      <div className="font-medium">₹{Number(room.room_total || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Booking Amount:</span>
                  <span>₹{Number(getTotalAmount(selectedBooking)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Details Dialog */}
      {selectedBooking && (
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Room Status Details</DialogTitle>
              <DialogDescription>
                Individual room statuses for booking {selectedBooking.booking_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Overall Status:</span>
                <Badge variant={getStatusVariant(getCombinedStatus(selectedBooking))}>
                  {getStatusLabel(getCombinedStatus(selectedBooking))}
                </Badge>
              </div>
              {selectedBooking.booking_rooms?.map((room, index) => (
                <div key={room.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">Room {room.room?.number || "N/A"}</span>
                    <div className="text-sm text-muted-foreground">
                      {room.room?.room_type?.name || "Standard Room"}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(room.room_status)}>
                    {getStatusLabel(room.room_status)}
                  </Badge>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
