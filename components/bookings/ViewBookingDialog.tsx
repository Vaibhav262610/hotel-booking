"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface ViewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any | null;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function ViewBookingDialog({ open, onOpenChange, booking, getStatusBadge }: ViewBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>View complete booking information</DialogDescription>
        </DialogHeader>
        {booking && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Booking Number</Label>
                <p className="text-sm">{booking.booking_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-sm">{getStatusBadge(booking.status)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Guest Name</Label>
                <p className="text-sm">{booking.guest?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="text-sm">{booking.guest?.phone}</p>
              </div>
            </div>
            {booking.guest?.email && (
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm">{booking.guest?.email}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Room</Label>
                <p className="text-sm">Room {booking.room?.number} - {booking.room?.type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Staff</Label>
                <p className="text-sm">{booking.staff?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Check-in</Label>
                <p className="text-sm">{booking.check_in ? format(new Date(booking.check_in), "PPP") : "N/A"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Check-out</Label>
                <p className="text-sm">{booking.check_out ? format(new Date(booking.check_out), "PPP") : "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Total Amount</Label>
                <p className="text-sm">₹{booking.total_amount?.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Advance Paid</Label>
                <p className="text-sm">₹{booking.advance_amount?.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Payment Method</Label>
              <p className="text-sm">{booking.payment_method}</p>
            </div>
            {booking.special_requests && (
              <div>
                <Label className="text-sm font-medium">Special Requests</Label>
                <p className="text-sm">{booking.special_requests}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


