"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { bookingService, roomService, type Room, type Booking, type Guest, guestService } from "@/lib/supabase";
import { format } from "date-fns";
import { ChangePaxTariffDialog } from "./change-pax-tariff-dialog";

interface CheckInInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  bookingId?: string;
  onSuccess?: () => void;
}

export function CheckInInfoDialog({
  open,
  onOpenChange,
  room,
  bookingId,
  onSuccess,
}: CheckInInfoDialogProps) {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [thisRoomBr, setThisRoomBr] = useState<any | null>(null);
  const [chargeItems, setChargeItems] = useState<any[]>([]);
  const [isChangePaxTariffOpen, setIsChangePaxTariffOpen] = useState(false);

  useEffect(() => {
    if (open && (room || bookingId)) {
      // Clear previous data first to prevent showing wrong info
      setBooking(null);
      setGuest(null);
      setTransactions([]);
      setThisRoomBr(null);
      setChargeItems([]);
      
      fetchBookingInfo();
    }
  }, [open, room?.id, bookingId]);

  const fetchBookingInfo = async () => {
    try {
      setLoading(true);
      
      if (bookingId) {
        // Fetch by booking ID
        const bookingData = await bookingService.getBookingById(bookingId);
        if (bookingData) {
          setBooking(bookingData);
          if (bookingData.guest_id) {
            const guestData = await guestService.getGuestById(bookingData.guest_id);
            setGuest(guestData);
          }
          
          // Fetch charge items
          try {
            const chargeItemsData = await bookingService.getChargeItems(bookingData.id)
            setChargeItems(chargeItemsData)
          } catch (error) {
            console.error("Error fetching charge items:", error)
            setChargeItems([])
          }
        }      } else if (room) {
        // Fetch by room using active stay resolver (booking_rooms based)
        const info: any = await bookingService.getCheckinInfoByRoom(room.id);
        const activeBooking = info?.booking;
        if (!activeBooking) {
          console.log(`No active booking found for room ${room.number} (ID: ${room.id})`);
          setBooking(null);
          setGuest(null);
          setTransactions([]);
          setThisRoomBr(null);
          return;
        }
        setBooking(activeBooking);
        setGuest(activeBooking.guest as any);
        setTransactions(info.transactions || []);
        const br = activeBooking.booking_rooms?.find((x: any) => x.room_id === room.id) || activeBooking.booking_rooms?.[0] || null;
        setThisRoomBr(br);
        
        // Fetch charge items for room-based loading
        try {
          const chargeItemsData = await bookingService.getChargeItems(activeBooking.id)
          setChargeItems(chargeItemsData)
        } catch (error) {
          console.error("Error fetching charge items:", error)
          setChargeItems([])
        }
      }
    } catch (error) {
      console.error("Error fetching booking info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintGRC = () => {
    alert("Printing GRC... This feature is in development");
  };

  const handleUpdateCheckIn = () => {
    alert("Updating check-in... This feature is in development");
  };

  if (!booking && !loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>No active booking found</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p>There is no active booking for this room.</p>
            <Button onClick={() => onOpenChange(false)} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Check-In</span>
            <div className="flex space-x-2">
              <Button onClick={handlePrintGRC}>Print GRC</Button>
              <Button onClick={handleUpdateCheckIn}>Update Check-in</Button>
              <Button onClick={() => setIsChangePaxTariffOpen(true)} variant="outline">
                Change Pax/Tariff
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            View and manage guest check-in details and booking information
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="p-4 text-center">Loading booking information...</div>
        ) : (
          <>
            {/* Quick Check-In */}
            <div className="bg-green-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Quick Check-In</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Is Reservation</Label>
                  <div className="flex items-center h-10">
                    <Checkbox id="is-reservation" checked={!!booking?.booking_number} disabled />
                  </div>
                </div>
                
                <div>
                  <Label>Reservation Number</Label>
                  <Input value={booking?.booking_number || "RE2846"} disabled readOnly />
                </div>
                
                <div>
                  <Label>Arrival Mode</Label>
                  <Select defaultValue="OTA">
                    <SelectTrigger>
                      <SelectValue placeholder="Select arrival mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OTA">OTA</SelectItem>
                      <SelectItem value="Direct">Direct</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* <div>
                  <Label>OTA</Label>
                  <Input value={booking?.ota || "AGODA"} readOnly />
                </div> */}
                
                <div>
                  <Label>Booking ID</Label>
                  <Input value={booking?.id?.substring(0, 10) || "1935309724"} readOnly />
                </div>
                
                <div>
                  <Label>Take Photo</Label>
                  <div className="flex items-center h-10">
                    <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                      Photo
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Contact No.</Label>
                  <div className="flex gap-1">
                    <Input className="w-16" value="91" readOnly />
                    <Input value={guest?.phone || "9361616097"} readOnly />
                  </div>
                </div>
                
                <div>
                  <Label>Title</Label>
                  <Select defaultValue="Mr">
                    <SelectTrigger>
                      <SelectValue placeholder="Select title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>First Name</Label>
                  <Input value={guest?.first_name || guest?.name?.split(' ')[0] || ""} readOnly />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Last Name</Label>
                  <Input value={guest?.last_name || guest?.name?.split(' ').slice(1).join(' ') || ""} readOnly />
                </div>
                
                <div>
                  <Label>Gender</Label>
                  <Select defaultValue="male">
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={guest?.email || ""} readOnly />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">              
                <div>
                  <Label>City</Label>
                  <Input readOnly value={
                    typeof guest?.address === 'object' && guest?.address?.city 
                      ? guest.address.city 
                      : (typeof guest?.address === 'string' ? guest.address : '')
                  } />
                </div>
                
                <div>
                  <Label>ID No.</Label>
                  <Input placeholder="Enter ID No" />
                </div>
                
                <div>
                  <Label>Check-In Mode</Label>
                  <Select defaultValue="day">
                    <SelectTrigger>
                      <SelectValue placeholder="Select check-in mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Room Details Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Room Type</th>
                    <th className="border p-2 text-left">Room No.</th>
                    <th className="border p-2 text-left">Rate Plan</th>
                    <th className="border p-2 text-left">Meal Plan</th>
                    <th className="border p-2 text-left">Guest Name</th>
                    <th className="border p-2 text-left">Contact</th>
                    <th className="border p-2 text-center">Male</th>
                    <th className="border p-2 text-center">Female</th>
                    <th className="border p-2 text-center">Adult</th>
                    <th className="border p-2 text-center">Child</th>
                    <th className="border p-2 text-center">Extra</th>
                    <th className="border p-2 text-right">Net Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">{room?.room_type?.name || ""}</td>
                    <td className="border p-2">{room?.number || "101"}</td>
                    <td className="border p-2">STD({booking?.payment_breakdown?.taxed_total_amount || booking?.payment_breakdown?.total_amount || room?.price || 1890}.00)</td>
             
                    <td className="border p-2">{guest?.first_name} {guest?.last_name}</td>
                    <td className="border p-2">{guest?.phone}</td>
           
                    <td className="border p-2 text-center">0</td>
                    <td className="border p-2 text-right">₹{booking?.payment_breakdown?.taxed_total_amount || booking?.payment_breakdown?.total_amount || room?.price || 1459.00}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Check-in Details */}
            <div className="mt-4 bg-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Check-in Details</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Check-in Type</Label>
                  <Select defaultValue="24h">
                    <SelectTrigger>
                      <SelectValue placeholder="Select check-in type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 Hours CheckIn</SelectItem>
                      <SelectItem value="day">Day Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Check-in Date & Time</Label>
                  <Input value={booking?.check_in ? format(new Date(booking.check_in), "dd-MM-yyyy HH:mm") : ""} readOnly />
                </div>
                
                {/* hope it works */}
                <div>
                  <Label>No. of Days</Label>
                  <Input type="number" value={
                    booking?.check_in && booking?.expected_checkout ?
                    Math.ceil((new Date(booking.expected_checkout).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)) 
                    : "1"
                  } readOnly />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Check-out Date & Time</Label>
                  <Input value={booking?.expected_checkout ? format(new Date(booking.expected_checkout), "dd-MM-yyyy HH:mm") : ""} readOnly />
                </div>
                
                <div>
                  <Label>Check-out Grace Time</Label>
                  <Input value="01:00" readOnly />
                </div>
                
                <div>
                  <Label>GRC No.</Label>
                  {/* <Input value={booking?.grc_number || "GRC3127"} /> */}
                  <Input value={"GRC3127"} readOnly />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Payment By</Label>
                  <Select defaultValue="direct">
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Extra's Direct</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Check-in User</Label>
                  <Input value={booking?.staff?.name || ""} readOnly />
                </div>
                
                <div className="flex items-center mt-8">
                  <Checkbox id="allow-charges" checked disabled />
                  <label htmlFor="allow-charges" className="ml-2">
                    Allow Charges Posting
                  </label>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Financials</h3>
              <div className="grid grid-cols-3 text-center text-sm mb-3">
                <div>
                  <div className="font-semibold">Total Booking</div>
                  <div>₹{(() => {
                    // Calculate total including charges
                    const baseTotal = ((booking as any)?.payment_breakdown?.taxed_total_amount || (booking as any)?.payment_breakdown?.total_amount) || 0;
                    const chargesTotal = chargeItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
                    return (baseTotal + chargesTotal).toFixed(2);
                  })()}</div>
                </div>
                <div>
                  <div className="font-semibold">Paid</div>
                  <div>₹{(((booking as any)?.payment_breakdown?.total_paid) ?? (((booking as any)?.payment_breakdown?.advance_cash || 0) + ((booking as any)?.payment_breakdown?.advance_card || 0) + ((booking as any)?.payment_breakdown?.advance_upi || 0) + ((booking as any)?.payment_breakdown?.advance_bank || 0))).toFixed(2)}</div>
                </div>
                <div>
                  <div className="font-semibold">Outstanding</div>
                  <div>₹{(() => {
                    // Calculate outstanding including charges
                    const baseTotal = ((booking as any)?.payment_breakdown?.taxed_total_amount || (booking as any)?.payment_breakdown?.total_amount) || 0;
                    const chargesTotal = chargeItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
                    const totalAmount = baseTotal + chargesTotal;
                    const paidAmount = ((booking as any)?.payment_breakdown?.total_paid) ?? (
                      ((booking as any)?.payment_breakdown?.advance_cash || 0) +
                      ((booking as any)?.payment_breakdown?.advance_card || 0) +
                      ((booking as any)?.payment_breakdown?.advance_upi || 0) +
                      ((booking as any)?.payment_breakdown?.advance_bank || 0)
                    );
                    return Math.max(totalAmount - paidAmount, 0).toFixed(2);
                  })()}</div>
                </div>
              </div>
              {transactions && transactions.length > 0 && (
                <div className="text-sm">
                  <div className="font-medium mb-1">Recent payments</div>
                  <ul className="space-y-1">
                    {transactions.map((t) => (
                      <li key={t.id} className="flex justify-between border p-2 rounded-md bg-white">
                        <span>{t.transaction_type} • {t.payment_method}</span>
                        <span>₹{Number(t.amount).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ordered Items */}
              {chargeItems && chargeItems.length > 0 && (
                <div className="text-sm mt-4">
                  <div className="font-medium mb-1">Ordered items</div>
                  <ul className="space-y-1">
                    {chargeItems.map((item) => (
                      <li key={item.id} className="flex justify-between border p-2 rounded-md bg-white">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>₹{Number(item.total_amount).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Address Details */}
            <div className="mt-4 bg-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Address Details</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>GST Number</Label>
                  {/* <Input value={guest?.gst_number || ""} /> */}
                  <Input value={"GST12345"} readOnly />
                </div>
                
                <div>
                  <Label>GST Type</Label>
                  <Select defaultValue="unregistered">
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unregistered">UNREGISTERED</SelectItem>
                      <SelectItem value="registered">REGISTERED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  <div>
                  <Label>Address</Label>
                  <Input
                    readOnly
                    value={
                      typeof guest?.address === 'object' && guest?.address !== null
                        ? [
                            guest.address.street_address,
                            guest.address.city,
                            guest.address.postal_code,
                            guest.address.state,
                            guest.address.country,
                          ].filter(Boolean).join(", ")
                        : (typeof guest?.address === 'string' ? guest.address : '')
                    }
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>City</Label>
                  <Input value={
                    typeof guest?.address === 'object' && guest?.address?.city 
                      ? guest.address.city 
                      : "PUDUCHERRY"
                  } readOnly />
                </div>
                
                <div>
                  <Label>Pin Code</Label>
                  <Input readOnly value={
                    typeof guest?.address === 'object' && guest?.address?.postal_code 
                      ? guest.address.postal_code 
                      : ""
                  } />
                </div>
                  <div>
                  <Label>State</Label>
                  <Input readOnly value={
                    typeof guest?.address === 'object' && guest?.address?.state 
                      ? guest.address.state 
                      : ""
                  } />
                </div>
              </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Country</Label>
                  <Input readOnly value={
                    typeof guest?.address === 'object' && guest?.address?.country
                      ? guest.address.country
                      : (guest?.nationality || '')
                  } />
                </div>

                <div className="flex items-center mt-8">
                  <Checkbox id="is-vip" />
                  <label htmlFor="is-vip" className="ml-2">
                    Is VIP
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
      
      {/* Change Pax/Tariff Dialog */}
      {booking && thisRoomBr && (
        <ChangePaxTariffDialog
          open={isChangePaxTariffOpen}
          onOpenChange={setIsChangePaxTariffOpen}
          booking={booking}
          bookingRoom={thisRoomBr}
          onSuccess={() => {
            setIsChangePaxTariffOpen(false)
            // Add delay to ensure database update completes
            setTimeout(() => {
              setBooking(null)
              setGuest(null)
              setTransactions([])
              setThisRoomBr(null)
              fetchBookingInfo()
            }, 1000) // 1 second delay
          }}
        />
      )}
    </Dialog>
  );
}
