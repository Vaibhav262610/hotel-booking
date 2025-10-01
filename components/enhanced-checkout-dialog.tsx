"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format, differenceInDays, parseISO, isBefore, isAfter, startOfDay } from "date-fns"
import { CalendarIcon, AlertTriangle, CheckCircle, DollarSign, Clock, User, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Booking } from "@/lib/supabase"
import { useFormThemeStability } from "@/hooks/use-form-theme-stability"
import { ThemeProvider } from "next-themes"

interface EnhancedCheckoutDialogProps {
  booking: Booking
  isOpen: boolean
  onClose: () => void
  onCheckout: (data: CheckoutData) => Promise<void>
}

interface CheckoutData {
  actualCheckOutDate: Date
  earlyCheckoutReason?: string
  priceAdjustment: number
  finalAmount: number
  adjustmentReason: string
  remainingBalance?: number
  remainingBalanceCollectedBy?: string
  remainingBalancePaymentMethod?: string
}

const earlyCheckoutReasons = [
  "Guest request",
  "Emergency departure",
  "Travel plans changed",
  "Business meeting ended early",
  "Family emergency",
  "Weather conditions",
  "Transportation issues",
  "Health reasons",
  "Other"
]

export function EnhancedCheckoutDialog({ booking, isOpen, onClose, onCheckout }: EnhancedCheckoutDialogProps) {
  const safeParseISO = (value: string | null | undefined): Date => {
    if (!value || typeof value !== "string") return new Date(0)
    try {
      // parseISO throws if invalid or if value isn't a string
      return parseISO(value)
    } catch {
      return new Date(0)
    }
  }
  const { startSubmission, endSubmission } = useFormThemeStability()
  const [actualCheckOutDate, setActualCheckOutDate] = useState<Date>(new Date())
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [priceAdjustment, setPriceAdjustment] = useState(0)
  const [finalAmount, setFinalAmount] = useState(0)
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [remainingBalance, setRemainingBalance] = useState(0)
  const [remainingBalanceCollectedBy, setRemainingBalanceCollectedBy] = useState("")
  const [remainingBalancePaymentMethod, setRemainingBalancePaymentMethod] = useState("")
  const [staff, setStaff] = useState<any[]>([])

  useEffect(() => {
    if (booking && isOpen) {
      // Get dates from booking_rooms (new schema)
      const firstRoom = booking.booking_rooms?.[0]
      if (!firstRoom) {
        console.error('No rooms found in booking')
        return
      }

      const scheduledCheckOut = safeParseISO(firstRoom.check_out_date)
      const checkInDate = safeParseISO(firstRoom.check_in_date)
      const today = startOfDay(new Date())
      
      // Set default checkout date to today or scheduled date, whichever is earlier
      setActualCheckOutDate(isBefore(today, scheduledCheckOut) ? today : scheduledCheckOut)
      
      calculatePriceAdjustment(
        today,
        scheduledCheckOut,
        checkInDate,
        booking.payment_breakdown?.taxed_total_amount || booking.payment_breakdown?.total_amount || 0
      )
      
      // Calculate remaining balance using database outstanding_amount
      const remaining = booking.payment_breakdown?.outstanding_amount || 0
      setRemainingBalance(remaining > 0 ? remaining : 0)
      
      // Fetch staff for remaining balance collection
      fetchStaff()
    }
  }, [booking, isOpen, finalAmount])

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      if (response.ok) {
        const staffData = await response.json()
        setStaff(staffData)
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }

  const calculatePriceAdjustment = (actualDate: Date, scheduledDate: Date, checkInDate: Date, totalAmount: number) => {
    const scheduledDays = Math.ceil((scheduledDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    const actualDays = Math.ceil((actualDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysDifference = scheduledDays - actualDays

    let adjustment = 0
    let reason = ""

    if (daysDifference > 0) {
      // Early checkout - calculate refund
      const dailyRate = totalAmount / scheduledDays
      adjustment = -(dailyRate * daysDifference)
      reason = `Early checkout: ${daysDifference} day(s) refund`
    } else if (daysDifference < 0) {
      // Late checkout - calculate additional charges
      const dailyRate = totalAmount / scheduledDays
      adjustment = Math.abs(dailyRate * Math.abs(daysDifference))
      reason = `Late checkout: ${Math.abs(daysDifference)} day(s) additional charge`
    }

    setPriceAdjustment(adjustment)
    setFinalAmount(totalAmount + adjustment)
    setAdjustmentReason(reason)
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date && booking) {
      setActualCheckOutDate(date)
      const firstRoom = booking.booking_rooms?.[0]
      if (!firstRoom) return
      
      const scheduledCheckOut = safeParseISO(firstRoom.check_out_date)
      const checkInDate = safeParseISO(firstRoom.check_in_date)
      calculatePriceAdjustment(
        date,
        scheduledCheckOut,
        checkInDate,
        booking.payment_breakdown?.taxed_total_amount || booking.payment_breakdown?.total_amount || 0
      )
    }
  }

  const handleCheckout = async () => {
    if (!booking) return

    startSubmission() // Prevent theme switching during submission
    setIsProcessing(true)
    try {
      const reason = earlyCheckoutReason === "Other" ? customReason : earlyCheckoutReason
      await onCheckout({
        actualCheckOutDate,
        earlyCheckoutReason: reason,
        priceAdjustment,
        finalAmount,
        adjustmentReason,
        remainingBalance: remainingBalance > 0 ? remainingBalance : undefined,
        remainingBalanceCollectedBy: remainingBalance > 0 ? remainingBalanceCollectedBy : undefined,
        remainingBalancePaymentMethod: remainingBalance > 0 ? remainingBalancePaymentMethod : undefined
      })
      onClose()
    } catch (error) {
      console.error("Checkout error:", error)
    } finally {
      setIsProcessing(false)
      endSubmission() // Allow theme changes after submission
    }
  }

  if (!booking) return null

  const firstRoom = booking.booking_rooms?.[0]
  if (!firstRoom) return null

  const scheduledCheckOut = safeParseISO(firstRoom.check_out_date)
  const checkInDate = safeParseISO(firstRoom.check_in_date)
  const isEarlyCheckout = isBefore(actualCheckOutDate, scheduledCheckOut)
  const isLateCheckout = isAfter(actualCheckOutDate, scheduledCheckOut)
  const isOnTime = !isEarlyCheckout && !isLateCheckout

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-theme="light">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Enhanced Checkout
            </DialogTitle>
            <DialogDescription>
              Complete checkout process with automatic price adjustments for early or late departures
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Guest and Room Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Guest</Label>
                    <p className="font-medium">{booking.guest?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Room</Label>
                    <p className="font-medium">
                      {firstRoom?.room?.number} - {firstRoom?.room?.room_type?.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Booking ID</Label>
                    <p className="font-medium">{booking.booking_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Original Amount</Label>
                    <p className="font-medium">₹{(booking.payment_breakdown?.total_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checkout Date Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Checkout Date
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scheduled Checkout</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{format(scheduledCheckOut, "PPP")}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Actual Checkout Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !actualCheckOutDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {actualCheckOutDate ? format(actualCheckOutDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={actualCheckOutDate}
                          onSelect={handleDateChange}
                          initialFocus
                          disabled={(date) => date < checkInDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Checkout Status Alert */}
                {isEarlyCheckout && (
                  <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      <strong>Early Checkout:</strong> Guest is checking out {differenceInDays(scheduledCheckOut, actualCheckOutDate)} day(s) early. 
                      A refund will be calculated automatically.
                    </AlertDescription>
                  </Alert>
                )}

                {isLateCheckout && (
                  <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      <strong>Late Checkout:</strong> Guest is checking out {differenceInDays(actualCheckOutDate, scheduledCheckOut)} day(s) late. 
                      Additional charges will be applied.
                    </AlertDescription>
                  </Alert>
                )}

                {isOnTime && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <strong>On-time Checkout:</strong> Guest is checking out as scheduled. No price adjustments needed.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Early Checkout Reason */}
            {(isEarlyCheckout || isLateCheckout) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Reason for {isEarlyCheckout ? "Early" : "Late"} Checkout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Select value={earlyCheckoutReason} onValueChange={setEarlyCheckoutReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {earlyCheckoutReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {earlyCheckoutReason === "Other" && (
                    <div className="space-y-2">
                      <Label>Custom Reason *</Label>
                      <Textarea
                        placeholder="Please specify the reason..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Price Calculation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Price Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Original Amount</Label>
                    <p className="text-2xl font-bold">₹{(booking.payment_breakdown?.taxed_total_amount || booking.payment_breakdown?.total_amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Price Adjustment</Label>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-2xl font-bold",
                        priceAdjustment > 0 ? "text-red-600 dark:text-red-400" : priceAdjustment < 0 ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"
                      )}>
                        {priceAdjustment > 0 ? "+" : ""}₹{priceAdjustment.toLocaleString()}
                      </p>
                      {priceAdjustment !== 0 && (
                        <Badge variant={priceAdjustment > 0 ? "destructive" : "default"}>
                          {priceAdjustment > 0 ? "Additional" : "Refund"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Final Amount</Label>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">₹{finalAmount.toLocaleString()}</p>
                  </div>
                </div>

                {adjustmentReason && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Adjustment Reason:</strong> {adjustmentReason}
                    </p>
                  </div>
                )}

                {/* Payment Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold">Payment Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Advance Paid:</span>
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">₹{
                        (
                          (booking.payment_breakdown?.advance_cash || 0) +
                          (booking.payment_breakdown?.advance_card || 0) +
                          (booking.payment_breakdown?.advance_upi || 0) +
                          (booking.payment_breakdown?.advance_bank || 0)
                        ).toLocaleString()
                      }</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="ml-2 font-medium text-orange-600 dark:text-orange-400">
                        ₹{(booking.payment_breakdown?.outstanding_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remaining Balance Collection */}
                {remainingBalance > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Collect Remaining Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          <strong>Remaining Balance:</strong> ₹{remainingBalance.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount Collected *</Label>
                          <Input
                            type="number"
                            value={remainingBalance}
                            onChange={(e) => setRemainingBalance(Number(e.target.value) || 0)}
                            placeholder="Enter amount collected"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Method *</Label>
                          <Select value={remainingBalancePaymentMethod} onValueChange={setRemainingBalancePaymentMethod}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Collected By (Staff) *</Label>
                        <Select value={remainingBalanceCollectedBy} onValueChange={setRemainingBalanceCollectedBy}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name} - {member.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={
                isProcessing || 
                (isEarlyCheckout && !earlyCheckoutReason) || 
                (earlyCheckoutReason === "Other" && !customReason) ||
                (remainingBalance > 0 && (!remainingBalanceCollectedBy || !remainingBalancePaymentMethod))
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Checkout
                </>
              )}
            </Button>
          </DialogFooter>
        </ThemeProvider>
      </DialogContent>
    </Dialog>
  )
} 