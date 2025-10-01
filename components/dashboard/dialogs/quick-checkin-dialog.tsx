"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarIcon, Upload, X, CreditCard, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { guestService, bookingService, roomService, supabase } from "@/lib/supabase"
import { Room, Staff, QuickCheckInData, SplitPaymentData } from "../types"
import { useTaxCalculation } from "../hooks/use-tax-calculation"
import { useRoomAvailability } from "../hooks/use-room-availability"

interface QuickCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: Room[]
  staff: Staff[]
  onSuccess: () => void
}

export function QuickCheckinDialog({ open, onOpenChange, rooms, staff, onSuccess }: QuickCheckinDialogProps) {
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [idImage, setIdImage] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [quickCheckInData, setQuickCheckInData] = useState<QuickCheckInData>({
    roomId: "",
    advanceAmount: 0,
    paymentMethod: "",
    totalAmount: 0,
    taxCalculation: null
  })
  
  const [splitPaymentData, setSplitPaymentData] = useState<SplitPaymentData>({
    advanceMethod: "",
    remainingMethod: "",
    advanceAmount: 0,
    remainingAmount: 0,
    paymentType: "full"
  })

  const { toast } = useToast()
  const { calculateHotelTaxes } = useTaxCalculation()
  const { quickCheckInRoomAvailability, checkRoomAvailability } = useRoomAvailability()
  const activeFormRef = useRef<'quickCheckIn' | 'newBooking' | null>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIdImage(file)
    }
  }

  const handleRoomChange = (roomId: string) => {
    activeFormRef.current = 'quickCheckIn'
    const room = rooms.find(r => r.id === roomId)
    
    setQuickCheckInData(prev => ({
      ...prev,
      roomId
    }))
    
    if (room && checkInDate && checkOutDate) {
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const taxCalculation = calculateHotelTaxes(room.price, nights)
      
      setQuickCheckInData(prev => ({
        ...prev,
        roomId,
        totalAmount: taxCalculation.grandTotal,
        taxCalculation
      }))
      
      checkRoomAvailability(roomId, checkInDate, checkOutDate, 'quickCheckIn')
    }
  }

  const handleDateChange = (type: 'checkIn' | 'checkOut', date: Date | undefined) => {
    activeFormRef.current = 'quickCheckIn'
    if (type === 'checkIn') setCheckInDate(date)
    if (type === 'checkOut') setCheckOutDate(date)
  }

  useEffect(() => {
    if (checkInDate && checkOutDate) {
      if (quickCheckInData.roomId) {
        const room = rooms.find(r => r.id === quickCheckInData.roomId)
        if (room) {
          const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
          const taxCalculation = calculateHotelTaxes(room.price, nights)
          
          setQuickCheckInData(prev => ({
            ...prev,
            totalAmount: taxCalculation.grandTotal,
            taxCalculation
          }))
          
          checkRoomAvailability(quickCheckInData.roomId, checkInDate, checkOutDate, 'quickCheckIn')
        }
      }
    }
  }, [checkInDate, checkOutDate, quickCheckInData.roomId, rooms, calculateHotelTaxes, checkRoomAvailability])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    try {
      setIsLoading(true)
      
      const guestName = formData.get("guestName") as string
      const phone = formData.get("phone") as string
      const roomId = formData.get("roomId") as string
      const staffId = formData.get("staffId") as string
      const idType = formData.get("idType") as string
      const idNumber = formData.get("idNumber") as string

      // Validate required fields
      if (!guestName?.trim() || !phone?.trim() || !roomId || !staffId || !idType || !idNumber?.trim()) {
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

      if (!splitPaymentData.advanceMethod) {
        toast({
          title: "Validation Error",
          description: "Payment method is required",
          variant: "destructive",
        })
        return
      }      // Create guest first
      const addressObj = {
        street_address: formData.get("street_address") as string || "",
        city: formData.get("city") as string || "PUDUCHERRY",
        postal_code: formData.get("postal_code") as string || "605003",
        state: formData.get("state") as string || "Tamil Nadu",
        country: formData.get("country") as string || "India"
      };
      
      const guestData = {
        name: guestName,
        email: formData.get("email") as string,
        phone: phone,
        address: addressObj,
        id_type: idType,
        id_number: idNumber,
      }

      const guest = await guestService.createGuest(guestData)

      // Upload ID image if provided
      if (idImage) {
        const { error: uploadError } = await supabase.storage
          .from("guest-documents")
          .upload(`${guest.id}/id-${Date.now()}.${idImage.name.split(".").pop()}`, idImage)

        if (uploadError) console.error("Upload error:", uploadError)
      }

      // Create booking
      await bookingService.createBooking({
        guestName: guestData.name,
        guestPhone: guestData.phone || "",
        guestEmail: guestData.email || "",
        roomId: quickCheckInData.roomId,
        staffId: formData.get("staffId") as string,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        totalAmount: quickCheckInData.taxCalculation?.grandTotal || 0,
        advanceAmount: splitPaymentData.advanceAmount,
        paymentMethod: splitPaymentData.advanceMethod,
        specialRequests: formData.get("specialRequests") as string,
        taxRates: quickCheckInData.taxCalculation ? {
          gst: quickCheckInData.taxCalculation.gst,
          cgst: quickCheckInData.taxCalculation.cgst,
          sgst: quickCheckInData.taxCalculation.sgst,
          luxuryTax: quickCheckInData.taxCalculation.luxuryTax,
          serviceCharge: quickCheckInData.taxCalculation.serviceCharge
        } : undefined
      })

      // Update room status to occupied
      await roomService.updateRoomStatus(quickCheckInData.roomId, "occupied", "Guest checked in")

      toast({
        title: "Success",
        description: "Guest checked in successfully!",
      })

      onOpenChange(false)
      resetForm()
      onSuccess()
    } catch (error) {
      console.error("Error during check-in:", error)
      toast({
        title: "Error",
        description: `Error during check-in: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setQuickCheckInData({
      roomId: "",
      advanceAmount: 0,
      paymentMethod: "",
      totalAmount: 0,
      taxCalculation: null
    })
    setSplitPaymentData({
      advanceMethod: "",
      remainingMethod: "",
      advanceAmount: 0,
      remainingAmount: 0,
      paymentType: "full"
    })
    setCheckInDate(undefined)
    setCheckOutDate(undefined)
    setIdImage(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-theme="light">
        <DialogHeader>
          <DialogTitle>Quick Check-in</DialogTitle>
          <DialogDescription>Check in a guest immediately</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name *</Label>
              <Input id="guestName" name="guestName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>          <div className="space-y-4">
            <Label>Address Information</Label>
            <div className="space-y-2">
              <Label htmlFor="street_address">Street Address</Label>
              <Textarea id="street_address" name="street_address" placeholder="Street address, house number, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue="PUDUCHERRY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input id="postal_code" name="postal_code" defaultValue="605003" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue="Tamil Nadu" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue="India" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idType">ID Type *</Label>
              <Select name="idType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aadhar">Aadhar Card</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="driving-license">Driving License</SelectItem>
                  <SelectItem value="voter-id">Voter ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number *</Label>
              <Input id="idNumber" name="idNumber" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idImage">Upload ID Image</Label>
            <div className="flex items-center gap-2">
              <Input
                id="idImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("idImage")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload ID
              </Button>
              {idImage && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">{idImage.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIdImage(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomId">Room *</Label>
              <Select 
                name="roomId" 
                required
                onValueChange={handleRoomChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms
                    .filter((room) => room.status === "available")
                    .map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.number} - {room.type} (₹{room.price}/night)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              {quickCheckInRoomAvailability && (
                <div className="mt-2">
                  {quickCheckInRoomAvailability.checking ? (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking room availability...
                    </div>
                  ) : quickCheckInRoomAvailability.available ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Room is available for selected dates
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {quickCheckInRoomAvailability.message || "Room is not available"}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffId">Staff *</Label>
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
          </div>
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
                  <Calendar mode="single" selected={checkInDate} onSelect={(date) => handleDateChange('checkIn', date)} initialFocus />
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
                  <Calendar mode="single" selected={checkOutDate} onSelect={(date) => handleDateChange('checkOut', date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tax Breakdown Section */}
          {quickCheckInData.taxCalculation && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Breakdown
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Room Charges ({quickCheckInData.taxCalculation.nights} nights):</span>
                  <span className="font-medium">₹{quickCheckInData.taxCalculation.subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-blue-200 pt-3">
                <h5 className="text-sm font-semibold text-blue-800">Taxes & Charges</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST (12%):</span>
                    <span>₹{quickCheckInData.taxCalculation.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST (6%):</span>
                    <span>₹{quickCheckInData.taxCalculation.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SGST (6%):</span>
                    <span>₹{quickCheckInData.taxCalculation.sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Luxury Tax (5%):</span>
                    <span>₹{quickCheckInData.taxCalculation.luxuryTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Charge (10%):</span>
                    <span>₹{quickCheckInData.taxCalculation.serviceCharge.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-blue-200 pt-3">
                <div className="flex justify-between text-lg font-semibold text-blue-900">
                  <span>Total Amount:</span>
                  <span>₹{quickCheckInData.taxCalculation.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Type Selection */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Payment Arrangement</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="fullPayment"
                  name="paymentType"
                  value="full"
                  checked={splitPaymentData.paymentType === "full"}
                  onChange={(e) => setSplitPaymentData(prev => ({ 
                    ...prev, 
                    paymentType: "full",
                    advanceAmount: 0,
                    remainingAmount: 0
                  }))}
                />
                <Label htmlFor="fullPayment" className="text-sm font-medium">
                  Full Payment Now (₹{quickCheckInData.totalAmount.toFixed(2)})
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="advancePayment"
                  name="paymentType"
                  value="advance"
                  checked={splitPaymentData.paymentType === "advance"}
                  onChange={(e) => setSplitPaymentData(prev => ({ 
                    ...prev, 
                    paymentType: "advance"
                  }))}
                />
                <Label htmlFor="advancePayment" className="text-sm font-medium">
                  Advance Payment + Remaining at Check-in
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="checkoutPayment"
                  name="paymentType"
                  value="checkout"
                  checked={splitPaymentData.paymentType === "checkout"}
                  onChange={(e) => setSplitPaymentData(prev => ({ 
                    ...prev, 
                    paymentType: "checkout",
                    advanceAmount: 0,
                    remainingAmount: 0
                  }))}
                />
                <Label htmlFor="checkoutPayment" className="text-sm font-medium">
                  Advance Payment + Remaining at Check-out (including additional charges)
                </Label>
              </div>
            </div>

            {/* Advance Payment Section */}
            {(splitPaymentData.paymentType === "advance" || splitPaymentData.paymentType === "checkout") && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                <h5 className="font-semibold text-blue-900">Advance Payment Details</h5>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advanceAmount">Advance Amount *</Label>
                    <Input 
                      id="advanceAmount" 
                      name="advanceAmount" 
                      type="number" 
                      placeholder="0"
                      value={splitPaymentData.advanceAmount}
                      onChange={(e) => {
                        const amount = Number(e.target.value) || 0
                        setQuickCheckInData(prev => ({ ...prev, advanceAmount: amount }))
                        setSplitPaymentData(prev => ({ 
                          ...prev, 
                          advanceAmount: amount,
                          remainingAmount: quickCheckInData.totalAmount - amount
                        }))
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advanceMethod">Payment Method *</Label>
                    <Select 
                      value={splitPaymentData.advanceMethod}
                      onValueChange={(value) => setSplitPaymentData(prev => ({ ...prev, advanceMethod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {splitPaymentData.advanceAmount > 0 && (
                  <div className="bg-white p-3 rounded border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Advance Paid:</span>
                      <span className="font-medium text-blue-700">₹{splitPaymentData.advanceAmount.toFixed(2)} ({splitPaymentData.advanceMethod})</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold text-blue-800">
                      <span>Remaining Balance:</span>
                      <span>₹{splitPaymentData.remainingAmount.toFixed(2)}</span>
                    </div>
                    
                    {splitPaymentData.paymentType === "advance" && (
                      <div className="space-y-2">
                        <Label htmlFor="remainingMethod">Remaining Payment Method</Label>
                        <Select 
                          value={splitPaymentData.remainingMethod}
                          onValueChange={(value) => setSplitPaymentData(prev => ({ ...prev, remainingMethod: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {splitPaymentData.paymentType === "checkout" && (
                      <div className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> Remaining balance (₹{splitPaymentData.remainingAmount.toFixed(2)}) + any additional charges 
                          will be collected at check-out. Payment method will be selected during check-out process.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Full Payment Section */}
            {splitPaymentData.paymentType === "full" && (
              <div className="bg-green-50 p-4 rounded-lg space-y-4">
                <h5 className="font-semibold text-green-900">Full Payment Details</h5>
                
                <div className="space-y-2">
                  <Label htmlFor="fullPaymentMethod">Payment Method *</Label>
                  <Select 
                    value={splitPaymentData.advanceMethod}
                    onValueChange={(value) => setSplitPaymentData(prev => ({ 
                      ...prev, 
                      advanceMethod: value,
                      advanceAmount: quickCheckInData.totalAmount,
                      remainingAmount: 0
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-white p-3 rounded border">
                  <div className="flex justify-between text-lg font-semibold text-green-800">
                    <span>Total Amount:</span>
                    <span>₹{quickCheckInData.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea id="specialRequests" name="specialRequests" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                "Check In Guest"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
