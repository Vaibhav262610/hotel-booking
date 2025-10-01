"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCircle, Grid, Loader2, Upload, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  formErrors: Record<string, string>;
  rooms: any[];
  staff: any[];
  handleIdUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRoomChange: (roomId: string) => void;
  roomAvailabilityStatus: any;
  splitPaymentData: any;
  setSplitPaymentData: (updater: (prev: any) => any) => void;
  taxCalculation: any;
  isCreatingBooking: boolean;
  onCreate: () => void;
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  formErrors,
  rooms,
  staff,
  handleIdUpload,
  handleRoomChange,
  roomAvailabilityStatus,
  splitPaymentData,
  setSplitPaymentData,
  taxCalculation,
  isCreatingBooking,
  onCreate,
}: CreateBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Add a new booking to the system with complete payment details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Guest Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Guest Name *</Label>
                <Input
                  id="guest-name"
                  placeholder="John Doe"
                  value={formData.guestName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, guestName: e.target.value }))
                  }
                  className={formErrors.guestName ? "border-red-500" : ""}
                />
                {formErrors.guestName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.guestName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="+91 9876543210"
                  value={formData.guestPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, guestPhone: e.target.value }))
                  }
                  className={formErrors.guestPhone ? "border-red-500" : ""}
                />
                {formErrors.guestPhone && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.guestPhone}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guest Category</Label>
                <Select value={formData.guestCategory || 'regular'} onValueChange={(v) => setFormData(prev => ({...prev, guestCategory: v}))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="travel_agent">Travel Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.guestEmail}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, guestEmail: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Upload ID Image</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" id="id-upload" />
                <Button type="button" variant="outline" onClick={() => document.getElementById("id-upload")?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload ID
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Grid className="h-5 w-5" />
              Room & Staff Assignment
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room">Room *</Label>
                <Select value={formData.roomId} onValueChange={handleRoomChange}>
                  <SelectTrigger className={formErrors.roomId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.length === 0 ? (
                      <SelectItem value="no-rooms" disabled>
                        No rooms found
                      </SelectItem>
                    ) : (
                      rooms
                        .filter((r) => r.status === "available")
                        .map((room) => (
                          <SelectItem key={String(room.id)} value={String(room.id)}>
                            {room.number} - {room.type} (₹{room.price}/night)
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                {formErrors.roomId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.roomId}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Select a room and dates to check availability</p>
                {roomAvailabilityStatus && (
                  <div className="mt-2">
                    {roomAvailabilityStatus.checking ? (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking room availability...
                      </div>
                    ) : roomAvailabilityStatus.available ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Room is available for selected dates
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {roomAvailabilityStatus.message || "Room is not available"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff">Assigned Staff *</Label>
                <Select
                  value={formData.staffId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, staffId: value }))}
                >
                  <SelectTrigger className={formErrors.staffId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={String(member.id)} value={String(member.id)}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.staffId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.staffId}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Stay Dates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.checkInDate && "text-muted-foreground",
                        formErrors.checkInDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.checkInDate && formData.checkInDate instanceof Date && !isNaN(formData.checkInDate.getTime()) ? (
                        format(formData.checkInDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.checkInDate}
                      onSelect={(date) => setFormData((prev) => ({ ...prev, checkInDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {formErrors.checkInDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.checkInDate}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Check-out Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.checkOutDate && "text-muted-foreground",
                        formErrors.checkOutDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.checkOutDate && formData.checkOutDate instanceof Date && !isNaN(formData.checkOutDate.getTime()) ? (
                        format(formData.checkOutDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.checkOutDate}
                      onSelect={(date) => setFormData((prev) => ({ ...prev, checkOutDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {formErrors.checkOutDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.checkOutDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Payment Information
            </h3>
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
                    onChange={() =>
                      setSplitPaymentData((prev) => ({
                        ...prev,
                        paymentType: "full",
                        advanceAmount: taxCalculation ? taxCalculation.grandTotal : 0,
                        remainingAmount: 0,
                      }))
                    }
                  />
                  <Label htmlFor="fullPayment" className="text-sm font-medium">
                    Full Payment Now (₹{taxCalculation ? taxCalculation.grandTotal.toFixed(2) : "0.00"})
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="advancePayment"
                    name="paymentType"
                    value="advance"
                    checked={splitPaymentData.paymentType === "advance"}
                    onChange={() =>
                      setSplitPaymentData((prev) => ({
                        ...prev,
                        paymentType: "advance",
                        advanceAmount: taxCalculation ? Math.ceil(taxCalculation.grandTotal * 0.3) : 0,
                        remainingAmount: taxCalculation ? taxCalculation.grandTotal - Math.ceil(taxCalculation.grandTotal * 0.3) : 0,
                      }))
                    }
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
                    onChange={() =>
                      setSplitPaymentData((prev) => ({
                        ...prev,
                        paymentType: "checkout",
                        advanceAmount: taxCalculation ? Math.ceil(taxCalculation.grandTotal * 0.3) : 0,
                        remainingAmount: taxCalculation ? taxCalculation.grandTotal - Math.ceil(taxCalculation.grandTotal * 0.3) : 0,
                      }))
                    }
                  />
                  <Label htmlFor="checkoutPayment" className="text-sm font-medium">
                    Advance Payment + Remaining at Check-out (including additional charges)
                  </Label>
                </div>
              </div>

              {(splitPaymentData.paymentType === "advance" || splitPaymentData.paymentType === "checkout") && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-4">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100">Advance Payment Details</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="advanceAmount">Advance Amount *</Label>
                      <Input
                        id="advanceAmount"
                        name="advanceAmount"
                        type="number"
                        placeholder="0"
                        value={splitPaymentData.advanceAmount || ""}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const amount = inputValue === "" ? 0 : Number(inputValue);
                          const maxAmount = taxCalculation ? taxCalculation.grandTotal : 0;
                          if (inputValue === "" || (!isNaN(amount) && amount >= 0)) {
                            const validAmount = amount > maxAmount ? maxAmount : amount;
                            setSplitPaymentData((prev) => ({
                              ...prev,
                              advanceAmount: validAmount,
                              remainingAmount: maxAmount - validAmount,
                            }));
                            setFormData((prev) => ({ ...prev, advanceAmount: validAmount, totalAmount: maxAmount }));
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advanceMethod">Advance Method *</Label>
                      <Select
                        value={splitPaymentData.advanceMethod}
                        onValueChange={(value) =>
                          setSplitPaymentData((prev) => ({ ...prev, advanceMethod: value }))
                        }
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Remaining Amount</Label>
                      <Input value={splitPaymentData.remainingAmount.toFixed(2)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Remaining Method</Label>
                      <Select
                        value={splitPaymentData.remainingMethod}
                        onValueChange={(value) =>
                          setSplitPaymentData((prev) => ({ ...prev, remainingMethod: value }))
                        }
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
                </div>
              )}

              {taxCalculation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal ({taxCalculation.nights} night{taxCalculation.nights > 1 ? "s" : ""}):</span>
                    <span>₹{taxCalculation.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">GST (12%):</span>
                      <span>₹{taxCalculation.gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">CGST (6%):</span>
                      <span>₹{taxCalculation.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">SGST (6%):</span>
                      <span>₹{taxCalculation.sgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Luxury Tax (5%):</span>
                      <span>₹{taxCalculation.luxuryTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Service Charge (10%):</span>
                      <span>₹{taxCalculation.serviceCharge.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                    <div className="flex justify-between text-lg font-semibold text-blue-900 dark:text-blue-100">
                      <span>Total Amount:</span>
                      <span>₹{taxCalculation.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  {splitPaymentData.advanceAmount > 0 && (
                    <div className="border-t border-blue-200 dark:border-blue-800 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Advance Paid:</span>
                        <span className="font-medium text-green-700 dark:text-green-300">₹{splitPaymentData.advanceAmount.toFixed(2)} ({splitPaymentData.advanceMethod})</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold text-green-800 dark:text-green-200">
                        <span>Remaining Balance:</span>
                        <span>₹{(taxCalculation.grandTotal - splitPaymentData.advanceAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="special-requests">Special Requests</Label>
                <Textarea
                  id="special-requests"
                  placeholder="Any special requests or notes..."
                  value={formData.specialRequests}
                  onChange={(e) => setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onCreate} disabled={isCreatingBooking}>
            {isCreatingBooking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


