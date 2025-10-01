"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { bookingService } from "@/lib/supabase"
import { format } from "date-fns"

interface AdvancePostingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: any
  room: any
  onSuccess: () => void
}

export function AdvancePostingDialog({
  open,
  onOpenChange,
  booking,
  room,
  onSuccess,
}: AdvancePostingDialogProps) {
  const [formData, setFormData] = useState({
    reference: '',
    amount: 0,
    settleMode: '',
    paymentInfo: '',
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        reference: '',
        amount: 0,
        settleMode: '',
        paymentInfo: '',
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return

    try {
      setIsLoading(true)
      
      console.log("Advance posting form submitted with data:", formData)

      // Validate required fields
      if (!formData.amount || formData.amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Amount must be greater than 0",
          variant: "destructive",
        })
        return
      }

      if (!formData.settleMode) {
        toast({
          title: "Validation Error",
          description: "Please select settle mode",
          variant: "destructive",
        })
        return
      }

      console.log("Submitting advance payment:", {
        bookingId: booking.id,
        amount: formData.amount,
        settleMode: formData.settleMode,
        staffId: booking.staff_id
      })

      // Record advance payment
      await bookingService.createAdvancePayment(booking.id, {
        amount: formData.amount,
        payment_method: formData.settleMode.toLowerCase(),
        reference_number: formData.reference || undefined,
        notes: formData.paymentInfo || `Advance payment for Room ${room.number}`,
        collected_by: booking.staff_id || booking.reserved_by_staff_id,
      })

      toast({
        title: "Success",
        description: `Advance payment of ₹${formData.amount} recorded successfully`,
      })

      onSuccess()
    } catch (error) {
      console.error("Error recording advance payment:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to record advance payment",
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Advance Posting</DialogTitle>
          <DialogDescription>
            Record additional advance payment for Room {room?.number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room and Guest Info */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Room No</Label>
                <Input value={`${room?.number} (${booking?.guest?.name || 'Guest'})`} readOnly />
              </div>
              <div>
                <Label>Guest Name</Label>
                <Input value={booking?.guest?.name || ''} readOnly />
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <div>
              <Label>Advance Date</Label>
              <Input value={format(new Date(), 'dd/MM/yyyy')} readOnly />
            </div>
            
            <div>
              <Label>Reference</Label>
              <Input
                placeholder="Payment reference number"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
              />
            </div>

            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', Number(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Settle Mode *</Label>
              <Select value={formData.settleMode} onValueChange={(v) => handleInputChange('settleMode', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Info</Label>
              <Input
                placeholder="Additional payment information"
                value={formData.paymentInfo}
                onChange={(e) => handleInputChange('paymentInfo', e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Post Exit
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
