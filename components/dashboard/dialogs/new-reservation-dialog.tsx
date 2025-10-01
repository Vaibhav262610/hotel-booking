"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarIcon, Plus, Minus, Users, Bed, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { reservationService, roomTypeService, RoomType, supabase } from "@/lib/supabase"
import { Room, Staff } from "../types"
import { useTaxCalculation } from "../hooks/use-tax-calculation"

interface NewReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: Room[]
  staff: Staff[]
  onSuccess: () => void
}

export function NewReservationDialog({ open, onOpenChange, rooms, staff, onSuccess }: NewReservationDialogProps) {
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [extraGuests, setExtraGuests] = useState(0)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [advanceCash, setAdvanceCash] = useState(0)
  const [advanceCard, setAdvanceCard] = useState(0)
  const [advanceUpi, setAdvanceUpi] = useState(0)
  const [advanceBank, setAdvanceBank] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Tax calculation
  const { calculateHotelTaxes, isLoading: isTaxLoading } = useTaxCalculation()
  const [taxCalculation, setTaxCalculation] = useState<{ subtotal: number; gst: number; cgst: number; sgst: number; luxuryTax: number; serviceCharge: number; totalTax: number; grandTotal: number; nights: number } | null>(null)
  const [roomAvailability, setRoomAvailability] = useState<Record<string, boolean>>({})
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)

  // Load room types
  useEffect(() => {
    async function loadRoomTypes() {
      try {
        const types = await roomTypeService.getRoomTypes()
        setRoomTypes(types)
      } catch (error) {
        console.error("Error loading room types:", error)
      }
    }
    loadRoomTypes()
  }, [])

  // Check room availability for selected dates
  const checkRoomAvailability = async (roomId: string, checkIn: Date, checkOut: Date) => {
    try {
      const { data, error } = await supabase
        .from('booking_rooms')
        .select(`
          id,
          bookings!inner(
            id,
            check_in_date,
            check_out_date,
            status
          )
        `)
        .eq('room_id', roomId)
        .in('bookings.status', ['confirmed', 'checked_in', 'checked_out'])
        .or(`and(check_in_date.lte.${checkOut.toISOString().split('T')[0]},check_out_date.gte.${checkIn.toISOString().split('T')[0]})`)

      if (error) {
        console.error('Error checking room availability:', error)
        return false
      }

      // Room is available if no conflicting bookings found
      return data.length === 0
    } catch (error) {
      console.error('Error checking room availability:', error)
      return false
    }
  }

  // Update room availability when dates change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const updateAvailability = async () => {
        setIsCheckingAvailability(true)
        const availability: Record<string, boolean> = {}
        
        for (const room of rooms) {
          if (room.status === 'available') {
            const isAvailable = await checkRoomAvailability(room.id, checkInDate, checkOutDate)
            availability[room.id] = isAvailable
          } else {
            availability[room.id] = false
          }
        }
        
        setRoomAvailability(availability)
        setIsCheckingAvailability(false)
      }
      
      updateAvailability()
    } else {
      setRoomAvailability({})
      setIsCheckingAvailability(false)
    }
  }, [checkInDate, checkOutDate, rooms])

  // Calculate tax when dates or room changes
  useEffect(() => {
    if (checkInDate && checkOutDate && selectedRoom && !isTaxLoading) {
      const room = rooms.find(r => r.id === selectedRoom)
      if (room) {
        const basePrice = room.room_type?.base_price || room.price || 0
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
        const calculation = calculateHotelTaxes(basePrice, nights)
        setTaxCalculation(calculation)
      }
    }
  }, [checkInDate, checkOutDate, selectedRoom, rooms, calculateHotelTaxes, isTaxLoading])

  const selectedRoomData = rooms.find(r => r.id === selectedRoom)
  // Calculate total guest count: adults + (children/2 rounded up) + extra guests
  const childrenAsGuests = Math.ceil(children / 2)
  const totalPax = adults + childrenAsGuests + extraGuests
  const roomCapacity = selectedRoomData?.room_type?.max_pax || selectedRoomData?.capacity || 2
  const isCapacityExceeded = totalPax > roomCapacity

  const availableRooms = rooms.filter(room => {
    // Check room status
    if (room.status !== 'available') return false
    
    // Check if dates are selected
    if (!checkInDate || !checkOutDate) return false
    
    // Check room availability for selected dates
    if (roomAvailability[room.id] === false) return false
    
    // Check if room can accommodate the number of guests
    const roomMaxPax = room.room_type?.max_pax || room.capacity || 2
    return totalPax <= roomMaxPax
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const formData = new FormData(event.currentTarget)

    try {
      setIsSubmitting(true)

      // Validate required fields
      const guestName = formData.get("guestName") as string
      const guestPhone = formData.get("guestPhone") as string
      const staffId = formData.get("staffId") as string
      
      if (!guestName?.trim() || !guestPhone?.trim() || !staffId || !selectedRoom) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }
      
      if (!checkInDate || !checkOutDate) {
        toast({
          title: "Validation Error",
          description: "Please select both check-in and check-out dates.",
          variant: "destructive",
        })
        return
      }

      if (checkOutDate <= checkInDate) {
        toast({
          title: "Invalid Dates",
          description: "Check-out date must be after check-in date.",
          variant: "destructive",
        })
        return
      }

      if (isCapacityExceeded) {
        toast({
          title: "Capacity Exceeded",
          description: `Selected room can only accommodate ${roomCapacity} guests, but ${totalPax} guests are selected.`,
          variant: "destructive",
        })
        return
      }

      if (!taxCalculation) {
        toast({
          title: "Calculation Error",
          description: "Unable to calculate pricing. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Validate advance payments don't exceed total
      if (totalAdvance > taxCalculation.grandTotal) {
        toast({
          title: "Invalid Advance Payment",
          description: `Advance payment (₹${totalAdvance.toFixed(2)}) cannot exceed total amount (₹${taxCalculation.grandTotal.toFixed(2)}).`,
          variant: "destructive",
        })
        return
      }

      // Prepare advance payments
      const advancePayments = []
      if (advanceCash > 0) advancePayments.push({ method: 'cash' as const, amount: advanceCash })
      if (advanceCard > 0) advancePayments.push({ method: 'card' as const, amount: advanceCard })
      if (advanceUpi > 0) advancePayments.push({ method: 'upi' as const, amount: advanceUpi })
      if (advanceBank > 0) advancePayments.push({ method: 'bank' as const, amount: advanceBank })

      // Create reservation
      await reservationService.createReservation({
        guestName,
        guestPhone,
        guestEmail: formData.get("guestEmail") as string || undefined,
        staffId,
        roomId: selectedRoom,
        checkInDate,
        checkOutDate,
        specialRequests: formData.get("specialRequests") as string || undefined,
        number_of_guests: adults,
        child_guests: children,
        extra_guests: extraGuests,
        meal_plan: (formData.get("mealPlan") as 'CP' | 'MAP' | 'EP') || 'EP',
        plan_name: formData.get("planName") as string || 'STD',
        purpose: formData.get("purpose") as string || undefined,
        ota_company: formData.get("otaCompany") as string || undefined,
        arrival_type: (formData.get("arrivalType") as 'walk_in' | 'phone' | 'online' | 'OTA' | 'agent' | 'corporate') || 'walk_in',
        totalAmount: taxCalculation.grandTotal,
        advancePayments
      })

      toast({
        title: "Success",
        description: "Reservation created successfully!",
      })

      onOpenChange(false)
      resetForm()
      onSuccess()
    } catch (error) {
      console.error("Error creating reservation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create reservation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCheckInDate(undefined)
    setCheckOutDate(undefined)
    setSelectedRoom("")
    setAdults(1)
    setChildren(0)
    setExtraGuests(0)
    setAdvanceCash(0)
    setAdvanceCard(0)
    setAdvanceUpi(0)
    setAdvanceBank(0)
    setTaxCalculation(null)
  }

  const totalAdvance = advanceCash + advanceCard + advanceUpi + advanceBank

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" data-theme="light">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            New Reservation
          </DialogTitle>
          <DialogDescription>Create a new single-room reservation</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Guest Name *</Label>
                  <Input id="guestName" name="guestName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestPhone">Phone Number *</Label>
                  <Input id="guestPhone" name="guestPhone" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestEmail">Email</Label>
                <Input id="guestEmail" name="guestEmail" type="email" />
              </div>
            </CardContent>
          </Card>

          {/* Guest Count */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest Count
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Adults</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{adults}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAdults(adults + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Children</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{children}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setChildren(children + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Extra Guests</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExtraGuests(Math.max(0, extraGuests - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{extraGuests}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExtraGuests(extraGuests + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Total Guests:</strong> {totalPax} ({adults} adults + {children} children + {extraGuests} extra)
                  {children > 0 && (
                    <span className="text-xs block mt-1">
                      Note: Children count as half guests (rounded up)
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stay Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stay Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-in Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !checkInDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkInDate ? format(checkInDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={checkInDate} onSelect={setCheckInDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Check-out Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !checkOutDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkOutDate ? format(checkOutDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={checkOutDate} onSelect={setCheckOutDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {checkInDate && checkOutDate && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-800">
                    <strong>Stay Duration:</strong> {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Room Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Room Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!checkInDate || !checkOutDate ? (
                <div className="p-4 text-center text-muted-foreground">
                  Please select check-in and check-out dates first to see available rooms
                </div>
              ) : isCheckingAvailability ? (
                <div className="p-4 text-center text-muted-foreground">
                  Checking room availability...
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="p-4 text-center text-destructive">
                  No rooms available for the selected dates and guest count
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="roomId">Select Room *</Label>
                    <Select value={selectedRoom} onValueChange={setSelectedRoom} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRooms.map((room) => {
                          const roomMaxPax = room.room_type?.max_pax || room.capacity || 2
                          const isCapacityExceeded = totalPax > roomMaxPax
                          
                          return (
                            <SelectItem key={room.id} value={room.id} disabled={isCapacityExceeded}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col">
                                  <span className="font-medium">{room.number} - {room.room_type?.name}</span>
                                  {isCapacityExceeded && (
                                    <span className="text-xs text-destructive">
                                      Capacity exceeded ({totalPax} &gt; {roomMaxPax})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <Badge variant="secondary">
                                    ₹{room.room_type?.base_price || room.price || 0}/night
                                  </Badge>
                                  <Badge variant={isCapacityExceeded ? "destructive" : "outline"}>
                                    Max {roomMaxPax} guests
                                  </Badge>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRoomData && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Bed className="h-4 w-4" />
                        <span className="font-medium">{selectedRoomData.number}</span>
                        <span>•</span>
                        <span>{selectedRoomData.room_type?.name}</span>
                        <span>•</span>
                        <span>Max {roomCapacity} guests</span>
                        {isCapacityExceeded && (
                          <Badge variant="destructive" className="ml-2">
                            Capacity Exceeded
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId">Staff Member *</Label>
                  <Select name="staffId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
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
                <div className="space-y-2">
                  <Label htmlFor="arrivalType">Arrival Type</Label>
                  <Select name="arrivalType" defaultValue="walk_in">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="OTA">OTA</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mealPlan">Meal Plan</Label>
                  <Select name="mealPlan" defaultValue="EP">
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EP">EP (European Plan)</SelectItem>
                      <SelectItem value="CP">CP (Continental Plan)</SelectItem>
                      <SelectItem value="MAP">MAP (Modified American Plan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planName">Plan Name</Label>
                  <Input name="planName" defaultValue="STD" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea name="specialRequests" placeholder="Any special requests or notes..." />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
              {isTaxLoading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Loading tax rates...</div>
                </div>
              ) : taxCalculation ? (
                <>
                <div className="flex justify-between text-sm">
                  <span>Room Rate (per night)</span>
                  <span>₹{selectedRoomData?.room_type?.base_price || selectedRoomData?.price || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Nights</span>
                  <span>{taxCalculation.nights}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{taxCalculation.subtotal.toFixed(2)}</span>
                </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-600">Tax Breakdown:</div>
                    {taxCalculation.gst > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>GST (12%)</span>
                        <span>₹{taxCalculation.gst.toFixed(2)}</span>
                      </div>
                    )}
                    {taxCalculation.cgst > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>CGST (6%)</span>
                        <span>₹{taxCalculation.cgst.toFixed(2)}</span>
                      </div>
                    )}
                    {taxCalculation.sgst > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>SGST (6%)</span>
                        <span>₹{taxCalculation.sgst.toFixed(2)}</span>
                      </div>
                    )}
                    {taxCalculation.luxuryTax > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Luxury Tax (5%)</span>
                        <span>₹{taxCalculation.luxuryTax.toFixed(2)}</span>
                      </div>
                    )}
                    {taxCalculation.serviceCharge > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Service Charge (10%)</span>
                        <span>₹{taxCalculation.serviceCharge.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Tax</span>
                  <span>₹{taxCalculation.totalTax.toFixed(2)}</span>
                    </div>
                </div>
                <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                  <span>Total Amount</span>
                  <span>₹{taxCalculation.grandTotal.toFixed(2)}</span>
                </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Select dates and room to see pricing</div>
                </div>
              )}
              </CardContent>
            </Card>

          {/* Advance Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Record Advance Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cash</Label>
                  <Input
                    type="number"
                    value={advanceCash}
                    onChange={(e) => setAdvanceCash(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card</Label>
                  <Input
                    type="number"
                    value={advanceCard}
                    onChange={(e) => setAdvanceCard(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UPI</Label>
                  <Input
                    type="number"
                    value={advanceUpi}
                    onChange={(e) => setAdvanceUpi(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Transfer</Label>
                  <Input
                    type="number"
                    value={advanceBank}
                    onChange={(e) => setAdvanceBank(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {totalAdvance > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Total Advance</span>
                    <span className="font-medium">₹{totalAdvance.toFixed(2)}</span>
                  </div>
                  {taxCalculation && (
                    <div className="flex justify-between text-sm mt-1">
                      <span>Remaining Balance</span>
                      <span className="font-medium">₹{(taxCalculation.grandTotal - totalAdvance).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isCapacityExceeded}>
              {isSubmitting ? "Creating..." : "Create Reservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}