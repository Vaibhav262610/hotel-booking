"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  LogOut,
  Wifi,
  PenTool,
  Lock,
  ClipboardList,
  ArrowRightLeft,
  FileText,
  AlertCircle,
  Star,
  CreditCard,
  Receipt,
  UserCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Room, type Booking, bookingService } from "@/lib/supabase";

interface DateDisplay {
  day: string;
  month: string;
  year: string;
  time: string;
}

interface RoomDetailMenuProps {
  room: Room;
  guestName?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  onAction: (action: string) => void;
  className?: string;
}

export function RoomDetailMenu({
  room,
  guestName,
  checkInDate,
  checkOutDate,
  onAction,
  className,
}: RoomDetailMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookingData, setBookingData] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [outstandingAmount, setOutstandingAmount] = useState<number>(0);
  const [guestPhone, setGuestPhone] = useState<string>("");

  // Fetch booking data when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      fetchBookingData();
    }
  }, [isOpen, room.id, room.status]);
  const fetchBookingData = async () => {
    try {
      setIsLoading(true);
      const activeBooking = await bookingService.getActiveStayByRoom(room.id);

      if (activeBooking) {
        console.log(
          `Found active booking (ID: ${activeBooking.id}) for room ${room.number}`
        );
        setBookingData(activeBooking);

        const paymentBreakdown = activeBooking.payment_breakdown;
        // Include ordered items in totals to match Check-in Info and Checkout
        const chargeItems = await bookingService.getChargeItems(activeBooking.id);
        const chargesTotal = Array.isArray(chargeItems)
          ? chargeItems.reduce((sum: number, item: any) => sum + (item?.total_amount || 0), 0)
          : 0;

        const baseTotal = (paymentBreakdown?.taxed_total_amount || paymentBreakdown?.total_amount || 0);
        const computedTotal = baseTotal + chargesTotal;

        // Paid should include all advances and receipts; fall back to total_paid if present
        const computedPaid = (paymentBreakdown?.total_paid !== null && paymentBreakdown?.total_paid !== undefined)
          ? paymentBreakdown.total_paid
          : (
              (paymentBreakdown?.advance_cash || 0) +
              (paymentBreakdown?.advance_card || 0) +
              (paymentBreakdown?.advance_upi || 0) +
              (paymentBreakdown?.advance_bank || 0) +
              (paymentBreakdown?.receipt_cash || 0) +
              (paymentBreakdown?.receipt_card || 0) +
              (paymentBreakdown?.receipt_upi || 0) +
              (paymentBreakdown?.receipt_bank || 0)
            );

        const computedOutstanding = Math.max(computedTotal - computedPaid, 0);

        setTotalAmount(computedTotal);
        setPaidAmount(computedPaid);
        setOutstandingAmount(computedOutstanding);

        // Set guest phone if available
        if (activeBooking.guest?.phone) {
          setGuestPhone(activeBooking.guest.phone);
        }

        // Log guest data for debugging
        console.log("Guest data:", activeBooking.guest);
        console.log("Payment breakdown:", paymentBreakdown);
      } else {
        console.log(
          `No active booking found for room ${room.number} (ID: ${room.id})`
        );
        setBookingData(null);
        setTotalAmount(0);
        setPaidAmount(0);
        setOutstandingAmount(0);
      }
    } catch (error) {
      // Enhanced error handling with detailed logging
      console.error(
        `Error fetching booking data for room ${room.number} (ID: ${room.id}):`,
        error
      );

      // Extract and log more information about the error
      if (error && typeof error === "object") {
        if ("message" in error) {
          console.error(`Error message: ${(error as Error).message}`);
        }

        if ("code" in error) {
          console.error(`Error code: ${(error as any).code}`);
        }

        if ("details" in error) {
          console.error(`Error details: ${(error as any).details}`);
        }
      }

      // Set default values in case of error
      setBookingData(null);
      setTotalAmount(0);
      setPaidAmount(0);
      setOutstandingAmount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Format check-in date display
  const formatDateDisplay = (date?: Date): DateDisplay | null => {
    if (!date) return null;

    const day = date.getDate().toString();
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString();

    // Format time as HH:MM (24-hour)
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const time = `${hours}:${minutes}`;

    return { day, month, year, time };
  };

  // Use booking data from API if available, otherwise use props
  // Dates from this room's booking_rooms row if present
  const thisRoomBr = bookingData?.booking_rooms?.find((br: any) => br.room_id === room.id) || bookingData?.booking_rooms?.[0];
  const actualCheckIn = thisRoomBr?.actual_check_in ? new Date(thisRoomBr.actual_check_in) : (thisRoomBr?.check_in_date ? new Date(thisRoomBr.check_in_date) : checkInDate);
  const actualCheckOut = thisRoomBr?.actual_check_out ? new Date(thisRoomBr.actual_check_out) : (thisRoomBr?.check_out_date ? new Date(thisRoomBr.check_out_date) : checkOutDate);

  const checkIn = formatDateDisplay(actualCheckIn);
  const checkOut = formatDateDisplay(actualCheckOut);
  const actualGuestName =
    bookingData?.guest?.name ||
    (bookingData?.guest
      ? `${bookingData.guest.first_name || ""} ${bookingData.guest.last_name || ""}`.trim()
      : guestName || "Guest");

  const handleMenuItemClick = (action: string) => {
    setIsOpen(false);
    onAction(action);
  };
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6 text-white", className)}
        >
          <span className="sr-only">Open room menu</span>
          <div className="flex items-center justify-center">⋮</div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[350px] z-[100]"
        align="end"
        sideOffset={5}
        collisionPadding={20}
      >
        <div className="bg-black text-white p-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex gap-2">
                <div className="font-bold">{room.number}</div>
                <div>{actualGuestName}</div>
              </div>{" "}
            <div className="text-sm">
              {guestPhone || bookingData?.guest?.phone || ""}
            </div>
            <div className="text-sm uppercase">
              {typeof bookingData?.guest?.address === 'object' ? bookingData?.guest?.address?.city : (bookingData?.guest?.address || "")}
            </div>
            </div>
            <div className="text-right">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </Button>
            </div>
          </div>{" "}
        </div>

        <div className="flex justify-between p-1 bg-gray-100 border-b">
          <div className="flex-1 text-center border-r border-gray-300">
            <div className="text-sm font-bold">{checkIn?.day || "--"}</div>
            <div className="uppercase text-xs">{checkIn?.month || "--"}</div>
            <div className="text-xs">{checkIn?.year || "--"}</div>
            <div className="text-xs">{checkIn?.time || "--"}</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-sm font-bold">{checkOut?.day || "--"}</div>
            <div className="uppercase text-xs">{checkOut?.month || "--"}</div>
            <div className="text-xs">{checkOut?.year || "--"}</div>
            <div className="text-xs">{checkOut?.time || "--"}</div>
          </div>
        </div>

        <div className={cn("overflow-auto", isLoading ? "opacity-50" : "")}>
          <DropdownMenuItem
            onClick={() => handleMenuItemClick("checkin_info")}
            className="text-sm py-1 h-8"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Checkin info
          </DropdownMenuItem>

          {/* Only show checkout for confirmed/checked_in bookings */}
          {bookingData?.status && ['confirmed', 'checked_in'].includes(bookingData.status) && (
          <DropdownMenuItem
            onClick={() => handleMenuItemClick("check_out")}
            className="text-sm py-1 h-8"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Check out
          </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => handleMenuItemClick("change_pax_tariff")}
            className="text-sm py-1 h-8"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Change pax/tariff
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleMenuItemClick("advance_posting")}
            className="text-sm py-1 h-8"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Advance posting
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleMenuItemClick("charges_posting")}
            className="text-sm py-1 h-8"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Charges posting
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleMenuItemClick("room_transfer")}
            className="text-sm py-1 h-8"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Room transfer
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleMenuItemClick("maintenance_posting")}
            className="text-sm py-1 h-8"
          >
            <PenTool className="h-4 w-4 mr-2" />
            Mainten. Posting
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleMenuItemClick("authorization")}
            className="text-sm py-1 h-8"
          >
            <FileText className="h-4 w-4 mr-2" />
            Authorization
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="p-2 bg-gray-50 border-t">
          {/* Total Booking Amount */}
          <div className="grid grid-cols-3 text-center text-sm mb-2">
            <div>
              <div className="font-semibold">Total Booking</div>
              <div>₹{totalAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-semibold">Paid</div>
              <div>₹{paidAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-semibold">Outstanding</div>
              <div>₹{outstandingAmount.toFixed(2)}</div>
            </div>
          </div>
          
          {/* Room-specific information */}
          {bookingData?.booking_rooms && bookingData.booking_rooms.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs font-semibold text-gray-600 mb-1">Room Details</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-medium">Room Rate</div>
                  <div>₹{bookingData.booking_rooms[0]?.room_rate?.toFixed(2) || '0.00'}</div>
                </div>
                <div>
                  <div className="font-medium">Room Total</div>
                  <div>₹{bookingData.booking_rooms[0]?.room_total?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
