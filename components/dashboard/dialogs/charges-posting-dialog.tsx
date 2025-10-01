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
import { Trash2, Plus } from "lucide-react"

interface ChargesPostingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: any
  room: any
  onSuccess: () => void
}

interface ChargeItem {
  id: string
  product_id: string
  quantity: number
  rate: number
  total_amount: number
  cgst_amount: number
  sgst_amount: number
}

export function ChargesPostingDialog({
  open,
  onOpenChange,
  booking,
  room,
  onSuccess,
}: ChargesPostingDialogProps) {
  const [products, setProducts] = useState<any[]>([])
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([{
    id: crypto.randomUUID(),
    product_id: '',
    quantity: 1,
    rate: 0,
    total_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
  }])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Load products when dialog opens
  useEffect(() => {
    if (open) {
      loadProducts()
    }
  }, [open])

  const loadProducts = async () => {
    try {
      const productsData = await bookingService.getProducts()
      setProducts(productsData)
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    }
  }

  const addChargeItem = () => {
    setChargeItems(prev => [...prev, {
      id: crypto.randomUUID(),
      product_id: '',
      quantity: 1,
      rate: 0,
      total_amount: 0,
      cgst_amount: 0,
      sgst_amount: 0,
    }])
  }

  const removeChargeItem = (id: string) => {
    setChargeItems(prev => prev.filter(item => item.id !== id))
  }

  const updateChargeItem = (id: string, field: keyof ChargeItem, value: any) => {
    setChargeItems(prev => prev.map(item => {
      if (item.id !== id) return item
      
      const updated = { ...item, [field]: value }
      
      // Auto-fill rate when product is selected
      if (field === 'product_id' && value) {
        const product = products.find(p => p.id === value)
        if (product) {
          updated.rate = product.price
        }
      }
      
      // Recalculate totals when quantity or rate changes
      if (field === 'quantity' || field === 'rate' || field === 'product_id') {
        const baseAmount = updated.quantity * updated.rate
        updated.cgst_amount = baseAmount * 0.06 // 6% CGST
        updated.sgst_amount = baseAmount * 0.06 // 6% SGST
        updated.total_amount = baseAmount + updated.cgst_amount + updated.sgst_amount
      }
      
      return updated
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return

    try {
      setIsLoading(true)

      // Validate charge items
      const validItems = chargeItems.filter(item => 
        item.product_id && item.quantity > 0 && item.rate > 0
      )

      if (validItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one valid charge item",
          variant: "destructive",
        })
        return
      }

      // Record charges
      await bookingService.createChargePosting(booking.id, validItems)

      toast({
        title: "Success",
        description: `Charges posted successfully for Room ${room.number}`,
      })

      onSuccess()
    } catch (error) {
      console.error("Error recording charges:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to record charges",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const totalCharges = chargeItems.reduce((sum, item) => sum + item.total_amount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charges Posting</DialogTitle>
          <DialogDescription>
            Add charges to guest bill for Room {room?.number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room and Guest Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label>Room No.</Label>
              <Input value={`${room?.number} (${booking?.guest?.name || 'Guest'})`} readOnly />
            </div>
            <div>
              <Label>Date</Label>
              <Input value={format(new Date(), 'dd-MM-yyyy')} readOnly />
            </div>
          </div>

          {/* Charge Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Transaction Details</h3>
              <Button type="button" variant="outline" onClick={addChargeItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {chargeItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-6 gap-2 items-end p-3 border rounded">
                  <div className="space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select 
                      value={item.product_id} 
                      onValueChange={(v) => updateChargeItem(item.id, 'product_id', v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (₹{product.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateChargeItem(item.id, 'quantity', Number(e.target.value) || 1)}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateChargeItem(item.id, 'rate', Number(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">CGST</Label>
                    <Input value={item.cgst_amount.toFixed(2)} readOnly className="h-8" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Total</Label>
                    <Input value={item.total_amount.toFixed(2)} readOnly className="h-8" />
                  </div>

                  <div>
                    {chargeItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeChargeItem(item.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Charge Summary</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <Label>Charge Amount</Label>
                <div className="font-medium">₹{totalCharges.toFixed(2)}</div>
              </div>
              <div>
                <Label>CGST (6%)</Label>
                <div>₹{chargeItems.reduce((sum, item) => sum + item.cgst_amount, 0).toFixed(2)}</div>
              </div>
              <div>
                <Label>SGST (6%)</Label>
                <div>₹{chargeItems.reduce((sum, item) => sum + item.sgst_amount, 0).toFixed(2)}</div>
              </div>
              <div>
                <Label>Total Payable</Label>
                <div className="font-semibold">₹{totalCharges.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Posting..." : "Post Charges"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
