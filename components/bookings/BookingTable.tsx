"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Booking } from "@/lib/supabase";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Edit,
  Loader2,
  LogOut,
  Trash2,
  UserCheck,
  XCircle,
  Info,
  Building2,
} from "lucide-react";

// Helper to render status badge consistently
function StatusBadge({ status }: { status: Booking["status"] }) {
  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border";
  switch (status) {
    case "confirmed":
      return (
        <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
          <Clock className="h-3 w-3" /> Confirmed
        </span>
      );
    case "checked_in":
      return (
        <span className={`${base} bg-green-50 text-green-700 border-green-200`}>
          <CheckCircle2 className="h-3 w-3" /> Checked In
        </span>
      );
    case "checked_out":
      return (
        <span className={`${base} bg-gray-50 text-gray-700 border-gray-200`}>
          <LogOut className="h-3 w-3" /> Checked Out
        </span>
      );
    case "cancelled":
      return (
        <span className={`${base} bg-red-50 text-red-700 border-red-200`}>
          <XCircle className="h-3 w-3" /> Cancelled
        </span>
      );
    default:
      return (
        <span
          className={`${base} bg-muted text-muted-foreground border-transparent`}
        >
          {status}
        </span>
      );
  }
}

// Helper component to show room details
function RoomDetails({ booking }: { booking: Booking }) {
  if (!booking.booking_rooms || booking.booking_rooms.length === 0) {
    return <span className="text-gray-500">No rooms assigned</span>;
  }

  const totalAmount = booking.booking_rooms.reduce((sum, room) => 
    sum + (room.room_total || 0), 0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">Total: ₹{totalAmount.toFixed(2)}</span>
        <span className="text-xs text-gray-500">
          {booking.booking_rooms.length} room{booking.booking_rooms.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {booking.booking_rooms.map((room, index) => (
          <div key={room.id} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-gray-500" />
              <span className="font-medium">Room {room.room?.number}</span>
              <span className="text-gray-500">({room.room?.room_type?.name})</span>
            </div>
            <div className="text-right">
              <div className="font-medium">₹{room.room_total?.toFixed(2) || '0.00'}</div>
              <div className="text-gray-500">{room.room_status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BookingTableProps {
  bookings: Booking[];
  onEdit: (booking: Booking) => void;
  onCancel: (bookingId: string) => void;
  onCheckIn: (bookingId: string) => void;
  onCheckOut: (bookingId: string) => void;
  isCheckingInId: string | null;
  isCheckingOutId: string | null;
  isDeletingId: string | null;
  getStatusVariant: (status: Booking["status"]) => string;
}

export function BookingTable({
  bookings,
  onEdit,
  onCancel,
  onCheckIn,
  onCheckOut,
  isCheckingInId,
  isCheckingOutId,
  isDeletingId,
}: BookingTableProps) {
  return (
    <div className="space-y-6">
      {/* Desktop / Large Screen Table */}
      <div className="hidden md:block rounded-xl border shadow-sm bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="text-sm">
            <TableHeader className="bg-gradient-to-r from-blue-50/80 via-indigo-50/70 to-blue-50/80 backdrop-blur border-b sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold whitespace-nowrap">
                  Booking ID
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Guest
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Room
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Check-in
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Check-out
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Status
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Amount
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Tax Details
                </TableHead>
                <TableHead className="font-semibold text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-7 w-7 text-indigo-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <p className="text-base font-medium">No bookings found</p>
                      <p className="text-xs max-w-sm text-muted-foreground">
                        Adjust filters or create a new booking to get started.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => {
                  const advanceTotal = (booking.payment_breakdown?.advance_cash || 0) + (booking.payment_breakdown?.advance_card || 0) + (booking.payment_breakdown?.advance_upi || 0) + (booking.payment_breakdown?.advance_bank || 0);
                  const balance = (booking.payment_breakdown?.total_amount || 0) - advanceTotal;
                  return (
                    <TableRow
                      key={booking.id}
                      className="group hover:bg-blue-50/60 transition-colors border-b last:border-b-0"
                    >
                      <TableCell className="font-medium text-blue-700 whitespace-nowrap">
                        {booking.booking_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <div
                            className="font-medium leading-tight truncate"
                            title={booking.guest?.name || ""}
                          >
                            {booking.guest?.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            {booking.guest?.phone}
                          </div>
                          {booking.guest?.email && (
                            <div
                              className="text-xs text-gray-500 flex items-center gap-1 truncate"
                              title={booking.guest?.email}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              {booking.guest?.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                              />
                            </svg>
                            <span className="font-medium">
                              Room {booking.booking_rooms?.[0]?.room?.number}
                            </span>
                            {booking.booking_rooms && booking.booking_rooms.length > 1 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                    <Info className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Room Details</DialogTitle>
                                    <DialogDescription>
                                      All rooms assigned to this booking
                                    </DialogDescription>
                                  </DialogHeader>
                                  <RoomDetails booking={booking} />
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 capitalize">
                            {booking.booking_rooms?.[0]?.room?.room_type?.name}
                          </span>
                          {booking.booking_rooms && booking.booking_rooms.length > 1 && (
                            <span className="text-xs text-blue-600">
                              +{booking.booking_rooms.length - 1} more room{booking.booking_rooms.length - 1 > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 min-w-[110px]">
                          <span className="text-xs font-medium flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-green-600"
                              fill="none" viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {format(new Date(booking.check_in), "MMM dd, yyyy")}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {format(new Date(booking.check_in), "HH:mm")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 min-w-[110px]">
                          <span className="text-xs font-medium flex items-center gap-1 text-red-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {(() => {
                              const br = booking.booking_rooms?.[0] as any
                              const co = br?.actual_check_out || br?.check_out_date || booking.actual_check_out || booking.expected_checkout
                              return co ? format(new Date(co), "MMM dd, yyyy") : "-"
                            })()}
                          </span>
                          {booking.expected_checkout && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {format(new Date(booking.expected_checkout), "HH:mm")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <StatusBadge status={booking.room_status || booking.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <span className="font-semibold text-green-700">
                            ₹{booking.payment_breakdown?.total_amount?.toFixed(2) || "0.00"}
                          </span>
                          {advanceTotal > 0 && (
                            <span className="text-[10px] text-gray-500">
                              Adv: ₹{advanceTotal.toFixed(2)}
                            </span>
                          )}
                          {balance > 0 && (
                            <span className="text-[10px] text-orange-600 font-medium">
                              Bal: ₹{balance.toFixed(2)}
                            </span>
                          )}
                          {booking.booking_rooms && booking.booking_rooms.length > 1 && (
                            <span className="text-[10px] text-blue-600">
                              {booking.booking_rooms.length} rooms
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                          <span className="text-xs font-medium text-gray-700">
                            ₹{(booking.payment_breakdown?.taxed_total_amount || booking.payment_breakdown?.total_amount || 0).toFixed(2)}
                          </span>
                          {booking.payment_breakdown?.total_tax_amount && booking.payment_breakdown.total_tax_amount > 0 && (
                            <div className="text-[10px] text-gray-500">
                              <div className="flex flex-col gap-0.5">
                                {booking.payment_breakdown.gst_amount > 0 && (
                                  <span>GST: ₹{booking.payment_breakdown.gst_amount.toFixed(2)}</span>
                                )}
                                {booking.payment_breakdown.cgst_amount > 0 && (
                                  <span>CGST: ₹{booking.payment_breakdown.cgst_amount.toFixed(2)}</span>
                                )}
                                {booking.payment_breakdown.sgst_amount > 0 && (
                                  <span>SGST: ₹{booking.payment_breakdown.sgst_amount.toFixed(2)}</span>
                                )}
                                {booking.payment_breakdown.luxury_tax_amount > 0 && (
                                  <span>Luxury: ₹{booking.payment_breakdown.luxury_tax_amount.toFixed(2)}</span>
                                )}
                                {booking.payment_breakdown.service_charge_amount > 0 && (
                                  <span>Service: ₹{booking.payment_breakdown.service_charge_amount.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap gap-2 justify-end min-w-[180px]">
                          {(booking.room_status || booking.status) === "confirmed" && (
                            <Button
                              size="sm"
                              onClick={() => onCheckIn(booking.id)}
                              disabled={isCheckingInId === booking.id}
                              className="bg-green-600 hover:bg-green-700 shadow-sm"
                            >
                              {isCheckingInId === booking.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <UserCheck className="h-3 w-3 mr-1" />
                              )}
                              Check In
                            </Button>
                          )}
                          {(booking.room_status || booking.status) === "checked_in" && (
                            <Button
                              size="sm"
                              onClick={() => onCheckOut(booking.id)}
                              disabled={isCheckingOutId === booking.id}
                              variant="outline"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 shadow-sm"
                            >
                              {isCheckingOutId === booking.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <LogOut className="h-3 w-3 mr-1" />
                              )}
                              Check Out
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(booking)}
                            className="shadow-sm"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onCancel(booking.id)}
                            disabled={isDeletingId === booking.id}
                            className="shadow-sm"
                          >
                            {isDeletingId === booking.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Cancel Booking
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {bookings.length === 0 && (
          <div className="p-6 border rounded-lg bg-white/60 backdrop-blur text-center text-sm text-muted-foreground">
            No bookings found
          </div>
        )}
        {bookings.map((b) => {
          const advanceTotal = (b.payment_breakdown?.advance_cash || 0) + (b.payment_breakdown?.advance_card || 0) + (b.payment_breakdown?.advance_upi || 0) + (b.payment_breakdown?.advance_bank || 0);
          const balance = (b.payment_breakdown?.total_amount || 0) - advanceTotal;
          return (
            <div
              key={b.id}
              className="relative border rounded-lg bg-gradient-to-br from-white to-blue-50/50 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-medium text-blue-600 tracking-wide">
                    #{b.booking_number}
                  </div>
                  <div
                    className="font-semibold truncate"
                    title={b.guest?.name || ""}
                  >
                    {b.guest?.name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(b.check_in), "MMM dd")}
                    {b.expected_checkout &&
                       ` → ${format(new Date(b.expected_checkout), "MMM dd")}`}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <div className="text-gray-500">Room</div>
                  <div className="font-medium text-gray-700">
                    {b.booking_rooms?.[0]?.room?.number}{" "}
                    <span className="text-[10px] text-gray-500">
                      {b.booking_rooms?.[0]?.room?.room_type?.name}
                    </span>
                    {b.booking_rooms && b.booking_rooms.length > 1 && (
                      <span className="text-[10px] text-blue-600 ml-1">
                        +{b.booking_rooms.length - 1} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Amount</div>
                  <div className="font-medium text-green-700">
                    ₹{(b.payment_breakdown?.total_amount || 0).toFixed(0)}
                    {balance > 0 && (
                      <span className="text-orange-600 ml-1">
                        (+{balance.toFixed(0)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(b.room_status || b.status) === "confirmed" && (
                  <Button
                    onClick={() => onCheckIn(b.id)}
                    disabled={isCheckingInId === b.id}
                    className="bg-green-600 hover:bg-green-700 h-7 px-3"
                  >
                    {isCheckingInId === b.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                  </Button>
                )}
                {(b.room_status || b.status) === "checked_in" && (
                  <Button
                    onClick={() => onCheckOut(b.id)}
                    disabled={isCheckingOutId === b.id}
                    variant="outline"
                    className="h-7 px-3 border-orange-500 text-orange-600"
                  >
                    {isCheckingOutId === b.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <LogOut className="h-3 w-3" />
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => onEdit(b)}
                  className="h-7 px-3"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onCancel(b.id)}
                  disabled={isDeletingId === b.id}
                  className="h-7 px-3"
                >
                  {isDeletingId === b.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}