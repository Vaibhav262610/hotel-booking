"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { bookingService } from "@/lib/supabase"
import { useTaxCalculation } from "../hooks/use-tax-calculation"

interface ChangePaxTariffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: any
  bookingRoom: any
  onSuccess: () => void
}

export function ChangePaxTariffDialog({
  open,
  onOpenChange,
  booking,
  bookingRoom,
  onSuccess,
}: ChangePaxTariffDialogProps) {
  const [formData, setFormData] = useState({
    adults: 2,
    children: 0,
    extra_beds: 0,
    room_rate: 0,
    meal_plan: 'EP',
    discount_type: 'none' as 'none' | 'percent' | 'flat',
    discount_value: 0,
    apply_inclusive_tax: true,
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [taxCalculation, setTaxCalculation] = useState<any>(null)
  const { toast } = useToast()
  const { calculateHotelTaxes } = useTaxCalculation()

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && bookingRoom) {
      setFormData({
        adults: bookingRoom.adults || 2,
        children: bookingRoom.children || 0,
        extra_beds: bookingRoom.extra_beds || 0,
        room_rate: bookingRoom.room_rate || 0,
        meal_plan: bookingRoom.meal_plan || 'EP',
        discount_type: bookingRoom.discount_type || 'none',
        discount_value: bookingRoom.discount_value || 0,
        apply_inclusive_tax: bookingRoom.apply_inclusive_tax !== false,
      })
    }
  }, [open, bookingRoom])

  // Calculate taxes when form data changes
  useEffect(() => {
    if (formData.room_rate > 0) {
      // Calculate nights from actual booking dates
      const checkInDate = new Date(bookingRoom?.check_in_date || booking?.created_at)
      const checkOutDate = new Date(bookingRoom?.check_out_date || booking?.created_at)
      const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
      
      const calculation = calculateHotelTaxes(formData.room_rate, nights)
      setTaxCalculation(calculation)
    }
  }, [formData.room_rate, calculateHotelTaxes, bookingRoom?.check_in_date, bookingRoom?.check_out_date, booking?.created_at])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return

    try {
      setIsLoading(true)

      // Validate required fields
      if (!formData.adults || formData.adults < 1) {
        toast({
          title: "Validation Error",
          description: "Adults count must be at least 1",
          variant: "destructive",
        })
        return
      }

      if (!formData.room_rate || formData.room_rate <= 0) {
        toast({
          title: "Validation Error",
          description: "Room rate must be greater than 0",
          variant: "destructive",
        })
        return
      }

      // Update booking room
      await bookingService.updateBookingRoomPaxAndTariff(bookingRoom.id, {
        adults: formData.adults,
        children: formData.children,
        extra_beds: formData.extra_beds,
        room_rate: formData.room_rate,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        apply_inclusive_tax: formData.apply_inclusive_tax,
      })

      toast({
        title: "Success",
        description: "Room pax and tariff updated successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("Error updating pax/tariff:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to update room details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Room Pax and Tariff</DialogTitle>
          <DialogDescription>
            Modify guest count, tariff rates, and pricing for Room {bookingRoom?.room?.number}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(95vh-120px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pax Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Guest Count</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Adults *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.adults}
                  onChange={(e) => handleInputChange('adults', Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.children}
                  onChange={(e) => handleInputChange('children', Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Extra Beds</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.extra_beds}
                  onChange={(e) => handleInputChange('extra_beds', Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Tariff Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Tariff Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Rate *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.room_rate}
                  onChange={(e) => handleInputChange('room_rate', Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Meal Plan</Label>
                <Select value={formData.meal_plan} onValueChange={(v) => handleInputChange('meal_plan', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EP">EP (European Plan)</SelectItem>
                    <SelectItem value="CP">CP (Continental Plan)</SelectItem>
                    <SelectItem value="MAP">MAP (Modified American Plan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Discount Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Discount</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={formData.discount_type} onValueChange={(v: any) => handleInputChange('discount_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => handleInputChange('discount_value', Number(e.target.value) || 0)}
                  disabled={formData.discount_type === 'none'}
                />
              </div>
              <div className="space-y-2">
                <Label>Inclusive Tax</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    checked={formData.apply_inclusive_tax}
                    onCheckedChange={(checked) => handleInputChange('apply_inclusive_tax', checked)}
                  />
                  <span className="text-sm">Include taxes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Preview */}
          {taxCalculation && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold">Price Preview</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Room Rate:</span>
                  <span>₹{formData.room_rate.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-2 mb-1">Taxes & Charges</div>
                <div className="flex justify-between">
                  <span>GST (12%):</span>
                  <span>₹{(taxCalculation.gst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (6%):</span>
                  <span>₹{(taxCalculation.cgst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (6%):</span>
                  <span>₹{(taxCalculation.sgst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Luxury Tax (5%):</span>
                  <span>₹{(taxCalculation.luxuryTax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge (10%):</span>
                  <span>₹{(taxCalculation.serviceCharge || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span>₹{taxCalculation.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
