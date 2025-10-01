"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface DayViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  bookings: Array<{
    id: string;
    guest?: { name?: string };
    room?: { number?: string; type?: string };
    status: string;
    total_amount?: number | null;
    check_in?: string | null;
    check_out?: string | null;
  }>;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function DayViewDialog({ isOpen, onOpenChange, selectedDate, bookings, getStatusBadge }: DayViewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Bookings for {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? format(selectedDate, "MMMM dd, yyyy") : "Selected Date"}
          </DialogTitle>
          <DialogDescription>{bookings.length} booking(s) on this date</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No bookings on this date</p>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{booking.guest?.name}</h4>
                    <p className="text-sm text-gray-600">Room {booking.room?.number} - {booking.room?.type}</p>
                    <p className="text-sm text-gray-600">
                      {booking.check_in ? format(new Date(booking.check_in), "MMM dd") : "N/A"} - {booking.check_out ? format(new Date(booking.check_out), "MMM dd") : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(booking.status)}
                    <p className="text-sm text-gray-600 mt-1">₹{booking.total_amount?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


