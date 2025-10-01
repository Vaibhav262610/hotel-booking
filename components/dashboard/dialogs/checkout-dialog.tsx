"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { roomService, bookingService, calculateTaxes, DEFAULT_TAX_RATES } from "@/lib/supabase"
import { Booking } from "../types"

interface CheckOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookings: Booking[]
  onSuccess: () => void
}

export function CheckOutDialog({ open, onOpenChange, bookings, onSuccess }: CheckOutDialogProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [roomRent, setRoomRent] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [discountedAmount, setDiscountedAmount] = useState<number>(0)
  const [tax, setTax] = useState<{sgst: number; cgst: number; total: number}>({sgst: 0, cgst: 0, total: 0})
  const [finalAmount, setFinalAmount] = useState<number>(0)
  const [specialInstructions, setSpecialInstructions] = useState<string>("")
  const [billingName, setBillingName] = useState<string>("")
  const [billingCompany, setBillingCompany] = useState<string>("")
  const [billingAddress, setBillingAddress] = useState<string>("")
  const [gstNumber, setGstNumber] = useState<string>("")
  const [gstType, setGstType] = useState<string>("UNREGISTERED")
  const [activeTab, setActiveTab] = useState<string>("information")
  const [applyDiscount, setApplyDiscount] = useState<boolean>(false)
  const [graceTime, setGraceTime] = useState<string>("01:00")
  const { toast } = useToast()

  // Update calculations when booking or discount changes
  useEffect(() => {
    if (selectedBooking) {
      const baseTotalAmount = (selectedBooking as any)?.payment_breakdown?.total_amount || 0;
      setRoomRent(baseTotalAmount);
      setBillingName(selectedBooking.guest?.name || "");

      // Set billing address from guest data
      if (selectedBooking.guest?.address) {
        if (typeof selectedBooking.guest.address === 'object' && selectedBooking.guest.address !== null) {
          const addr = selectedBooking.guest.address;
          const formattedAddress = [
            addr.street_address,
            addr.city,
            `${addr.postal_code}, ${addr.state}`,
            addr.country
          ].filter(Boolean).join(", ");
          
          setBillingAddress(formattedAddress);
        } else if (typeof selectedBooking.guest.address === 'string') {
          setBillingAddress(selectedBooking.guest.address);
        }
      }

      // Calculate discount
      let discAmount = 0;
      if (applyDiscount) {
        if (discountType === 'amount') {
          discAmount = discount;
        } else { // percentage
          discAmount = (baseTotalAmount * discount) / 100;
        }
      }
      
      const afterDiscount = Math.max(0, baseTotalAmount - discAmount);
      setDiscountedAmount(discAmount);

      // Calculate taxes (CGST & SGST each at 6%)
      const taxRate = 12; // 12% total GST
      const taxAmount = (afterDiscount * taxRate) / 100;
      const sgst = taxAmount / 2;
      const cgst = taxAmount / 2;
      
      setTax({
        sgst: sgst,
        cgst: cgst,
        total: taxAmount
      });

      // Set final amount
      const calculatedFinalAmount = afterDiscount + taxAmount;
      setFinalAmount(calculatedFinalAmount);
    }
  }, [selectedBooking, discount, discountType, applyDiscount]);

  const handleCheckOut = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    try {
      if (!selectedBooking) {
        throw new Error("No booking selected");
      }

      // Process the checkout with detailed information (service will update booking_rooms and rooms)
      const result = await bookingService.checkOut(
        selectedBooking.id, 
        new Date(),
        {
          priceAdjustment: discountedAmount,
          finalAmount: finalAmount,
          adjustmentReason: applyDiscount ? `Discount applied: ${discountType === 'amount' ? '₹' + discount : discount + '%'}` : "No discount",
          remainingBalance: Math.max(0, finalAmount - (selectedBooking.advance_amount || 0)),
          remainingBalancePaymentMethod: "cash", // This should be dynamically set from a form field
          earlyCheckoutReason: JSON.stringify({
            billingName,
            billingCompany,
            billingAddress,
            gstNumber,
            gstType,
            specialInstructions,
            discountApplied: applyDiscount,
            discountAmount: discount,
            discountType,
            sgst: tax.sgst,
            cgst: tax.cgst,
            roomRent,
            graceTime
          })
        }
      );

      if (!result || (result as any).success === false) {
        throw new Error(((result as any).error as string) || 'Checkout failed');
      }

      toast({
        title: "Success",
        description: `Guest checked out successfully!`,
      });

      onOpenChange(false);
      setSelectedBooking(null);
      onSuccess();
    } catch (error) {
      console.error("Error during check-out:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check out guest. Please try again.",
        variant: "destructive",
      });
    }
  };

  const checkedInBookings = bookings.filter((booking: Booking) => 
    booking.status === "checked_in"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-out Guest</DialogTitle>
          <DialogDescription>Complete the check-out process for the guest</DialogDescription>
          
          <div className="border-b border-gray-200 mt-4">
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={() => setActiveTab("information")}
                className={`px-4 py-2 ${activeTab === 'information' 
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                  : 'text-gray-500'}`}
              >
                Check Out Information
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("charges")}
                className={`px-4 py-2 ${activeTab === 'charges' 
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                  : 'text-gray-500'}`}
              >
                Check Out Charges
              </button>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleCheckOut} className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="bookingSelect">Select Booking to Check Out</Label>
              <Select
                name="bookingId"
                onValueChange={(value) => setSelectedBooking(bookings.find((booking: Booking) => booking.id === value) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select booking" />
                </SelectTrigger>
                <SelectContent>
                  {checkedInBookings.map((booking: Booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.guest?.name} - {booking.booking_rooms?.map((br: any) => br.room?.number).filter(Boolean).join(', ') || booking.room?.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedBooking && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Check Out Information</h3>
                  <div className="bg-muted/50 p-4 rounded-md space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Room Type</Label>
        <div className="p-2 bg-white/50 rounded text-sm">{selectedBooking.booking_rooms?.[0]?.room?.room_type?.name || ""}</div>
                      </div>
                      <div>
                        <Label>Room No</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">{selectedBooking.booking_rooms?.[0]?.room?.number}</div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Guest Name</Label>
                      <div className="p-2 bg-white/50 rounded text-sm">{selectedBooking.guest?.name}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>OTA</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">AGODA</div>
                      </div>
                      <div>
                        <Label>Payment by</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">AGODA</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Rate Plan</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">STD</div>
                      </div>
                      <div>
                        <Label>No of Pax</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">1</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Extra Pax</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">0</div>
                      </div>
                      <div>
                        <Label>CheckIn By</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">24 Hours</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Check In Date</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">
                          {selectedBooking.booking_rooms?.[0]?.check_in_date ? format(new Date(selectedBooking.booking_rooms[0].check_in_date), "dd/MM/yyyy HH:mm") : "Not set"}
                        </div>
                      </div>                      <div>
                        <Label>Likely Checkout Date</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">
                          {selectedBooking.booking_rooms?.[0]?.check_out_date ? format(new Date(selectedBooking.booking_rooms[0].check_out_date), "dd/MM/yyyy HH:mm") : "Not set"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Current Checkout Date</Label>
                        <div className="p-2 bg-white/50 rounded text-sm">
                          {format(new Date(), "dd/MM/yyyy HH:mm")}
                        </div>
                      </div>
                      <div>
                        <Label>CheckOut Grace Time</Label>
                        <Input value={graceTime} onChange={(e) => setGraceTime(e.target.value)} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>New Rent Tariff</Label>
                        <Input
                          type="number"
                          value={roomRent}
                          onChange={(e) => setRoomRent(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Tariff</Label>
                        <Select defaultValue="inclusive">
                          <SelectTrigger>
                            <SelectValue placeholder="Select tariff type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                            <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Apply Tariff</Label>
                        <Select defaultValue="rent">
                          <SelectTrigger>
                            <SelectValue placeholder="Select application" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rent">Rent Only</SelectItem>
                            <SelectItem value="all">All Charges</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-7">
                        <Checkbox 
                          id="applyRentTariff" 
                          checked={true} 
                        />
                        <label
                          htmlFor="applyRentTariff"
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Apply Rent Tariff / Disc. All Days
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Discount per day</Label>
                        <Select 
                          defaultValue={discountType === 'amount' ? 'amount' : 'percentage'}
                          onValueChange={(value) => setDiscountType(value as 'amount' | 'percentage')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount">By Amount</SelectItem>
                            <SelectItem value="percentage">By Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Discount Rate</Label>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <Input 
                              type="number"
                              value={discount}
                              onChange={(e) => setDiscount(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Checkbox 
                              id="applyDiscount" 
                              checked={applyDiscount} 
                              onCheckedChange={(checked) => setApplyDiscount(checked as boolean)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Special Instructions</Label>
                      <Textarea
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="resize-none h-20"
                      />
                    </div>
                    
                    <div>
                      <Label>Billing Name</Label>
                      <Input
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Billing Company Name</Label>
                      <Input
                        value={billingCompany}
                        onChange={(e) => setBillingCompany(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Billing Address</Label>
                      <Textarea
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="resize-none h-24"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>GST No</Label>
                        <Input
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>GST Type</Label>
                        <Select 
                          defaultValue="UNREGISTERED"
                          onValueChange={setGstType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select GST type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNREGISTERED">UNREGISTERED</SelectItem>
                            <SelectItem value="REGISTERED">REGISTERED</SelectItem>
                            <SelectItem value="COMPOSITE">COMPOSITE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Check Out Charges</h3>
                  <div className="bg-muted/50 p-4 rounded-md space-y-2">                    <div className="flex justify-between items-center border-b border-gray-200 py-2">
                      <div className="font-medium">Charge</div>
                      <div className="font-medium">Amount</div>
                    </div>
                    <div className="py-1 bg-sky-100">
                      <div className="px-2 font-medium">{"->"} A - CHARGES</div>
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                      <div>Room Rent</div>
                      <div>{roomRent.toFixed(2)}</div>
                    </div>
                    
                    <div className="flex justify-between items-center px-2 font-medium bg-green-100">
                      <div></div>
                      <div>{roomRent.toFixed(2)}</div>
                    </div>
                      {applyDiscount && (
                      <>
                        <div className="py-1 bg-sky-100">
                          <div className="px-2 font-medium">{"->"} C - DISCOUNT</div>
                        </div>
                        
                        <div className="flex justify-between items-center px-2 text-orange-600">
                          <div>Discount on Rent</div>
                          <div>-{discountedAmount.toFixed(2)}</div>
                        </div>
                        
                        <div className="flex justify-between items-center px-2 font-medium text-orange-600 bg-green-100">
                          <div></div>
                          <div>-{discountedAmount.toFixed(2)}</div>
                        </div>
                      </>
                    )}
                      <div className="py-1 bg-sky-100">
                      <div className="px-2 font-medium">{"->"} D - TAX</div>
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                      <div>SGST</div>
                      <div>{tax.sgst.toFixed(2)}</div>
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                      <div>CGST</div>
                      <div>{tax.cgst.toFixed(2)}</div>
                    </div>
                    
                    <div className="flex justify-between items-center px-2 font-medium bg-green-100">
                      <div></div>
                      <div>{tax.total.toFixed(2)}</div>
                    </div>
                    
                    <div className="flex justify-between items-center px-2 py-3 font-medium text-lg bg-green-300">
                      <div>Amount Payable(4)</div>
                      <div>{finalAmount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}          <div className="flex flex-wrap gap-2 justify-between border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Save
            </Button>
            <Button type="button" variant="outline">
              Guest Folio
            </Button>
            <Button type="button" variant="outline">
              Change Pax & Tariff
            </Button>
            <Button type="button" variant="outline">
              Manage Charges
            </Button>
            <Button type="button" variant="outline">
              Part Bills
            </Button>
            <Button type="button" variant="outline">
              Quick Checkout
            </Button>
            <Button type="submit" disabled={!selectedBooking}>
              Bill and Check Out
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>  );
}
