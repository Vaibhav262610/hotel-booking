"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  roomService,
  bookingService,
  type Room,
  type Booking,
  type Staff,
  staffService,
  supabase,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Menu,
  LogOut,
  Calendar,
  ClipboardList,
  Lock,
  Unlock,
  PenTool,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckInDialog } from "./dashboard/dialogs/checkin-dialog";
import { EnhancedCheckoutDialog } from "./checkout/enhanced-checkout-dialog";
import { CheckInInfoDialog } from "./dashboard/dialogs/checkin-info-dialog";
import { NewReservationDialog } from "./dashboard/dialogs/new-reservation-dialog";
import { HousekeepingDialog } from "./dashboard/dialogs/housekeeping-dialog";
import { BlockRoomDialog } from "./dashboard/dialogs/block-room-dialog";
import { MaintenancePostingDialog } from "./dashboard/dialogs/maintenance-posting-dialog";
import { RoomCheckInDialog } from "./dashboard/dialogs/room-checkin-dialog";
import { RoomTransferDialog } from "./dashboard/dialogs/room-transfer-dialog";
import { ChangePaxTariffDialog } from "./dashboard/dialogs/change-pax-tariff-dialog";
import { AdvancePostingDialog } from "./dashboard/dialogs/advance-posting-dialog";
import { ChargesPostingDialog } from "./dashboard/dialogs/charges-posting-dialog";
import { RoomDetailMenu } from "./room-detail-menu";

const statusConfig = {
  available: {
    color: "bg-green-500",
    label: "Vacant",
    textColor: "text-green-700",
  },
  occupied: {
    color: "bg-red-400",
    label: "Occupied",
    textColor: "text-red-700",
  },
  reserved: {
    color: "bg-orange-500",
    label: "Reserved",
    textColor: "text-orange-700",
  },
  unclean: {
    color: "bg-yellow-500",
    label: "Dirty",
    textColor: "text-yellow-700",
  },
  maintenance: {
    color: "bg-gray-500",
    label: "Maintenance",
    textColor: "text-gray-700",
  },
  cleaning: {
    color: "bg-blue-500",
    label: "Cleaning",
    textColor: "text-blue-700",
  },
  blocked: {
    color: "bg-purple-500",
    label: "Blocked",
    textColor: "text-purple-700",
  },
  // dirty: { color: "bg-cyan-400", label: "Dirty", textColor: "text-cyan-700" },
  // vacant: {
  //   color: "bg-green-400",
  //   label: "Vacant",
  //   textColor: "text-green-700",
  // },
};

type RoomWithFloor = Room & {
  floorName: string;
  type?: string; // Add type property for backward compatibility
};

interface FloorWiseRoomStatusProps {
  className?: string;
}

export function FloorWiseRoomStatus({ className }: FloorWiseRoomStatusProps) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomWithFloor[]>([]);
  const [loading, setLoading] = useState(true);
  const [floors, setFloors] = useState<string[]>([]);
  const [activeFloor, setActiveFloor] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]); const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCheckouts, setExpandedCheckouts] = useState<boolean>(false);
  // Dialog states
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false);
  const [selectedBookingForCheckout, setSelectedBookingForCheckout] = useState<Booking | null>(null);
  const [selectedRoomForCheckout, setSelectedRoomForCheckout] = useState<Room | null>(null);
  const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] =
    useState(false);
  const [isHousekeepingDialogOpen, setIsHousekeepingDialogOpen] =
    useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isCheckInInfoDialogOpen, setIsCheckInInfoDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isRoomTransferDialogOpen, setIsRoomTransferDialogOpen] = useState(false);
  const [selectedBookingForTransfer, setSelectedBookingForTransfer] = useState<Booking | null>(null);
  const [isRoomCheckInDialogOpen, setIsRoomCheckInDialogOpen] = useState(false);
  const [isChangePaxTariffDialogOpen, setIsChangePaxTariffDialogOpen] = useState(false);
  const [selectedBookingForPaxTariff, setSelectedBookingForPaxTariff] = useState<any>(null);
  const [selectedRoomForPaxTariff, setSelectedRoomForPaxTariff] = useState<any>(null);
  const [isAdvancePostingDialogOpen, setIsAdvancePostingDialogOpen] = useState(false);
  const [selectedBookingForAdvance, setSelectedBookingForAdvance] = useState<any>(null);
  const [selectedRoomForAdvance, setSelectedRoomForAdvance] = useState<any>(null);
  const [isChargesPostingDialogOpen, setIsChargesPostingDialogOpen] = useState(false);
  const [selectedBookingForCharges, setSelectedBookingForCharges] = useState<any>(null);
  const [selectedRoomForCharges, setSelectedRoomForCharges] = useState<any>(null);
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch rooms data
        const roomsData = await roomService.getRooms();

        // Group rooms by floor and create floor names
        const roomsWithFloorNames = roomsData.map((room: Room) => ({
          ...room,
          floorName: getFloorName(room.floor),
        }));

        // Extract unique floor numbers and sort numerically, then map to names
        const uniqueFloorNumbers = Array.from(
          new Set(roomsData.map((room: Room) => room.floor))
        ).sort((a, b) => a - b);

        const uniqueFloors = uniqueFloorNumbers.map((num) => getFloorName(num));

        setRooms(roomsWithFloorNames);
        setFloors(uniqueFloors);

        // Set first floor as active by default
        if (uniqueFloors.length > 0 && !activeFloor) {
          setActiveFloor(uniqueFloors[0]);
        }

        // Fetch bookings via service to ensure correct joins with new schema
        try {
          const bookingsList = await bookingService.getBookings();
          setBookings(bookingsList || []);
        } catch (err) {
          console.error('Error fetching bookings:', err);
          setBookings([]);
        }

        // Fetch staff data for dialogs
        const staffData = await staffService.getStaff();
        setStaff(staffData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeFloor]);

  // Helper function to get floor name from floor number
  function getFloorName(floor: number): string {
    const floorNames = [
      "GROUND FLOOR",
      "FIRST FLOOR",
      "SECOND FLOOR",
      "THIRD FLOOR",
      "FOURTH FLOOR",
    ];
    return floorNames[floor] || `FLOOR ${floor}`;
  }
  const refreshRooms = async () => {
    try {
      const roomsData = await roomService.getRooms();

      const roomsWithFloorNames = roomsData.map((room: Room) => ({
        ...room,
        floorName: getFloorName(room.floor),
      }));

      setRooms(roomsWithFloorNames);
    } catch (error) {
      console.error("Error refreshing room data:", error);
    }
  };

  // Handle single room checkout
  const handleSingleRoomCheckout = async (booking: Booking, room: Room) => {
    try {
      const result = await bookingService.checkOutRoom(
        booking.id,
        room.id,
        new Date(),
        {
          earlyCheckoutReason: "Room checkout from dashboard",
          priceAdjustment: 0,
          finalAmount: booking.payment_breakdown?.total_amount || 0,
          adjustmentReason: "Standard room checkout",
          remainingBalance: 0
        }
      );

      if (result.success) {
        // Refresh data after successful checkout
        await refreshRooms();
        await fetchData();
        
        // Show success message
        console.log(`Room ${room.number} checked out successfully`);
      } else {
        console.error("Checkout failed:", result.error);
      }
    } catch (error) {
      console.error("Error during room checkout:", error);
    }
  };

  // Get rooms for the active floor
  const activeFloorRooms = rooms.filter(
    (room) => room.floorName === activeFloor
  );

  const handleRoomAction = async (room: Room, action: string) => {
    setSelectedRoom(room);

    try {
      switch (action.toLowerCase()) {
        // Original actions
        case "check in":
          setIsRoomCheckInDialogOpen(true);
          return;
        case "check_out":  // Added to handle the menu action
          // Find the booking associated with this room
          const roomBooking = bookings.find(booking => 
            booking.booking_rooms?.some(br => br.room_id === room.id) ||
            (booking as any).room_id === room.id
          );
          if (roomBooking && ['confirmed', 'checked_in'].includes(roomBooking.status)) {
            // Open the checkout modal with the booking data and room ID
            setSelectedBookingForCheckout(roomBooking);
            setSelectedRoomForCheckout(room);
            setIsCheckOutDialogOpen(true);
          } else if (roomBooking) {
            toast({
              title: "Checkout Not Available",
              description: `Booking cannot be checked out. Current status: ${roomBooking.status}`,
              variant: "destructive",
            });
          }
          return;
        case "new reservation":
          setIsNewReservationDialogOpen(true);
          return;
        case "housekeeping tasks":
          setIsHousekeepingDialogOpen(true);
          return;
        case "block":
          setIsBlockDialogOpen(true);
          return;
        case "maintenance":
          await updateRoomStatus(
            room.id,
            "maintenance",
            "Room marked for maintenance"
          );
          break;
        case "unblock":
          await updateRoomStatus(
            room.id,
            "available",
            "Room unblocked by admin"
          );
          break;
        // New actions from room detail menu
        case "checkin_info":
          setSelectedRoom(room);
          setIsCheckInInfoDialogOpen(true);
          return;
        case "change_pax_tariff":
          // Find booking for this room and open dialog
          const paxTariffBooking = bookings.find(booking => 
            booking.booking_rooms?.some(br => br.room_id === room.id)
          );
          console.log("Pax/Tariff for Room:", room.number, "Found booking:", paxTariffBooking?.booking_number)
          if (paxTariffBooking) {
            setSelectedBookingForPaxTariff(paxTariffBooking);
            setSelectedRoomForPaxTariff(room);
            setIsChangePaxTariffDialogOpen(true);
          }
          return;
        case "advance_posting":
          // Find booking for this room and open dialog
          const advanceBooking = bookings.find(booking => 
            booking.booking_rooms?.some(br => br.room_id === room.id)
          );
          console.log("Advance Posting for Room:", room.number, "Found booking:", advanceBooking?.booking_number)
          if (advanceBooking) {
            setSelectedBookingForAdvance(advanceBooking);
            setSelectedRoomForAdvance(room);
            setIsAdvancePostingDialogOpen(true);
          }
          return;
        case "charges_posting":
          // Find booking for this room and open dialog
          const chargesBooking = bookings.find(booking => 
            booking.booking_rooms?.some(br => br.room_id === room.id)
          );
          console.log("Charges Posting for Room:", room.number, "Found booking:", chargesBooking?.booking_number)
          if (chargesBooking) {
            setSelectedBookingForCharges(chargesBooking);
            setSelectedRoomForCharges(room);
            setIsChargesPostingDialogOpen(true);
          }
          return;
        case "room_transfer":
          // Find the booking associated with this room
          const transferBooking = bookings.find(booking => 
            booking.booking_rooms?.some(br => br.room_id === room.id) ||
            (booking as any).room_id === room.id
          );
          if (transferBooking) {
            setSelectedRoom(room);
            setSelectedBookingForTransfer(transferBooking);
            setIsRoomTransferDialogOpen(true);
          } else {
            console.error("No booking found for room transfer");
          }
          return;
        case "maintenance_posting":
          setSelectedRoom(room);
          setIsMaintenanceDialogOpen(true);
          return;
        case "authorization":
          console.log("Authorization action triggered for room", room.number);
          // Implement authorization functionality
          return;
        default:
          console.warn(`Unknown action: ${action}`);
          return;
      }
    } catch (error) {
      console.error(
        `Error performing ${action} on room ${room.number}:`,
        error
      );
    }
  };

  // Helper function to update room status
  const updateRoomStatus = async (
    roomId: string,
    status: string,
    reason: string
  ) => {
    const updatedRoom = await roomService.updateRoomStatus(
      roomId,
      status,
      reason
    );

    setRooms((currentRooms) => {
      return currentRooms.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            status: status as any, // Type assertion for status update
          };
        }
        return r;
      });
    });
  };
  const getRoomNameById = (roomId: string) => {
    const room = rooms.find((room) => room.id === roomId);
    return room ? room.number : "N/A";
  };

  const getGuestNameFromBooking = (booking: Booking) => {
    if (booking.guest?.name) {
      return booking.guest.name;
    } else if (booking.guest_id && booking.guest) {
      // If the guest object is populated through a join
      return (
        `${booking.guest.first_name || ""} ${booking.guest.last_name || ""}`.trim() ||
        "Guest"
      );
    }
    return "Guest";
  };

  const getTodaysCheckouts = () => {
    try {
      const today = new Date(2025, 8, 9);
      today.setHours(0, 0, 0, 0);

      // Get all rooms checking out today (including multi-room bookings)
      const checkoutRooms: any[] = [];

      bookings.forEach((booking) => {
        if (booking.status !== "checked_in") {
          return;
        }

        // Check if booking has expected_checkout today
        if (booking.expected_checkout) {
          try {
            const checkoutDate = new Date(booking.expected_checkout);
            checkoutDate.setHours(0, 0, 0, 0);

            if (checkoutDate.getTime() === today.getTime()) {
              // Add all rooms from this booking that are checking out today
              if (booking.booking_rooms) {
                booking.booking_rooms.forEach((roomBooking: any) => {
                  const roomCheckoutDate = roomBooking.check_out_date ?
                    new Date(roomBooking.check_out_date) : new Date(booking.expected_checkout);
                  roomCheckoutDate.setHours(0, 0, 0, 0);

                  if (roomCheckoutDate.getTime() === today.getTime()) {
                    checkoutRooms.push({
                      ...roomBooking,
                      booking: booking,
                      room: rooms.find(r => r.id === roomBooking.room_id)
                    });
                  }
                });
              } else {
                // Fallback for old single-room bookings (if room_id exists)
                if ((booking as any).room_id) {
                  const room = rooms.find(r => r.id === (booking as any).room_id);
                  if (room) {
                    checkoutRooms.push({
                      room_id: (booking as any).room_id,
                      check_out_date: booking.expected_checkout,
                      check_in_date: booking.check_in,
                      room_status: booking.status,
                      booking: booking,
                      room: room
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error parsing checkout date:", e);
          }
        }
      });

      // Sort checkouts by time
      return checkoutRooms.sort((a, b) => {
        const timeA = new Date(a.check_out_date || a.booking.expected_checkout).getTime();
        const timeB = new Date(b.check_out_date || b.booking.expected_checkout).getTime();
        return timeA - timeB;
      });
    } catch (error) {
      console.error("Error in getTodaysCheckouts:", error);
      return [];
    }
  };

  const todayCheckouts = getTodaysCheckouts();

  if (loading) {
    return (
      <div className={cn("text-center py-4 text-muted-foreground", className)}>
        Loading floor plan...
      </div>
    );
  }
  // Filter rooms based on search query
  const filteredRooms = activeFloorRooms.filter(room => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      room.number.toLowerCase().includes(query) ||
      (room.type || '').toLowerCase().includes(query) ||
      room.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row justify-between gap-2 items-center">
        <div className="overflow-x-auto flex-grow w-full">
          <Tabs
            value={activeFloor}
            onValueChange={setActiveFloor}
            className="w-full"
          >
            <TabsList className="bg-muted">
              {floors.map((floor) => (
                <TabsTrigger key={floor} value={floor} className="px-4">
                  {floor}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="relative w-full sm:w-auto">
          <Input
            type="search"
            placeholder="Search rooms..."
            className="h-9 w-full sm:w-[200px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", config.color)} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>      {/* Floor View with Rooms */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {filteredRooms.map((room) => {
          const status = room.status.toLowerCase() as keyof typeof statusConfig;
          const config = statusConfig[status] || statusConfig.available;

          // Find active booking for this room if it's occupied
          const activeBooking = room.status === "occupied" ?
            bookings.find(b => b.booking_rooms?.some((br: any) => br.room_id === room.id) &&
              b.status === "checked_in") : null;

          // Get room-specific data from booking_rooms
          const roomBookingData = activeBooking?.booking_rooms?.find((br: any) => br.room_id === room.id);

          // Get guest name and check-in/out dates if room is occupied
          const guestName = activeBooking ? getGuestNameFromBooking(activeBooking) : undefined;
          const checkInDate = roomBookingData?.check_in_date ? new Date(roomBookingData.check_in_date) :
            (activeBooking?.check_in ? new Date(activeBooking.check_in) : undefined);
          const checkOutDate = roomBookingData?.check_out_date ? new Date(roomBookingData.check_out_date) :
            (activeBooking?.expected_checkout ? new Date(activeBooking.expected_checkout) : undefined);

          return (
            <div
              key={room.id}
              className={cn(
                "relative rounded-md overflow-hidden cursor-pointer",
                config.color,
                "border border-gray-200"
              )}
            >
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-white">{room.number}</div>
                  {room.status === "occupied" ? (
                    <RoomDetailMenu
                      room={room}
                      guestName={guestName}
                      checkInDate={checkInDate}
                      checkOutDate={checkOutDate}
                      onAction={(action) => handleRoomAction(room, action)}
                    />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white"
                        >
                          <Menu size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(room.status === "available" || room.status === "reserved") && (
                          <DropdownMenuItem
                            onClick={() => handleRoomAction(room, "Check In")}
                          >
                            <LogOut className="h-4 w-4 mr-2 rotate-180" />
                            Check In
                          </DropdownMenuItem>
                        )}

                        {(room.status as any) === "occupied" && (
                          <DropdownMenuItem
                            onClick={() => handleRoomAction(room, "Check Out")}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Check Out
                          </DropdownMenuItem>
                        )}

                        {(room.status === "available") && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleRoomAction(room, "New Reservation")
                            }
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            New Reservation
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() =>
                            handleRoomAction(room, "HouseKeeping Tasks")
                          }
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Housekeeping Task
                        </DropdownMenuItem>

                        {room.status !== "blocked" && (
                          <DropdownMenuItem
                            onClick={() => handleRoomAction(room, "Block")}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Block Room
                          </DropdownMenuItem>
                        )}

                        {(room.status as any) !== "maintenance" && (
                          <DropdownMenuItem
                            onClick={() => handleRoomAction(room, "Maintenance")}
                          >
                            <PenTool className="h-4 w-4 mr-2" />
                            Mark for Maintenance
                          </DropdownMenuItem>
                        )}

                        {(room.status === "blocked") && (
                          <DropdownMenuItem
                            onClick={() => handleRoomAction(room, "Unblock")}
                          >
                            <Unlock className="h-4 w-4 mr-2" />
                            Unblock Room
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="text-xs mt-1 text-white opacity-90">
                  {room.type || (room as any).room_type?.name || 'Standard'}
                </div>
                <div className="text-xs font-medium text-white">
                  ₹{room.price.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
        <div className="bg-muted p-2 rounded">
          <div className="font-medium">Available</div>
          <div className="text-muted-foreground">
            {rooms.filter((r) => r.status === "available").length}
          </div>
        </div>
        <div className="bg-muted p-2 rounded">
          <div className="font-medium">Occupied</div>
          <div className="text-muted-foreground">
            {rooms.filter((r) => r.status === "occupied").length}
          </div>
        </div>
        <div className="bg-muted p-2 rounded">
          <div className="font-medium">Reserved</div>
          <div className="text-muted-foreground">
            {rooms.filter((r) => r.status === "reserved").length}
          </div>
        </div>
        <div className="bg-muted p-2 rounded">
          <div className="font-medium">Blocked</div>
          <div className="text-muted-foreground">
            {rooms.filter((r) => r.status === "blocked").length}
          </div>
        </div>
        <div className="bg-muted p-2 rounded">
          <div className="font-medium">Maintenance</div>
          <div className="text-muted-foreground">
            {rooms.filter((r) => (r.status as any) === "maintenance").length}
          </div>
        </div>
        <div className="bg-muted p-2 rounded">
          <div className="font-medium">Cleaning</div>
          <div className="text-muted-foreground">
            {rooms.filter((r) => (r.status as any) === "cleaning").length}
          </div>
        </div>
      </div>      {/* Room Reservation Schedule */}
      <div className={cn(
        "bg-card border rounded-md p-2",
        expandedCheckouts && "lg:col-span-2"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Today's Expected Checkout</div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpandedCheckouts(!expandedCheckouts)}
              title={expandedCheckouts ? "Collapse view" : "Expand view"}
            >
              {expandedCheckouts ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={async () => {
                try {
                  const { data: bookingsData, error: bookingsError } = await supabase
                    .from('bookings')
                    .select(`
                      *,
                      guest:guests(*),
                      payment_breakdown:booking_payment_breakdown(*),
                      booking_rooms(
                        *,
                        rooms(id, number, type, floor, price)
                      )
                    `)
                    .order('created_at', { ascending: false });

                  if (bookingsError) {
                    console.error('Error refreshing bookings:', bookingsError);
                  } else {
                    setBookings(bookingsData || []);
                  }
                } catch (error) {
                  console.error("Error refreshing checkout data:", error);
                }
              }}
              title="Refresh checkouts"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-refresh-cw"
              >
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
            </Button>
          </div>
        </div>
        {todayCheckouts.length > 0 ? (
          <>
            <div className={cn(
              "grid gap-1 text-xs font-medium",
              expandedCheckouts ? "grid-cols-5" : "grid-cols-3"
            )}>
              <div className="text-muted-foreground">Room</div>
              <div className="text-muted-foreground">Guest</div>
              <div className="text-muted-foreground">Time</div>
              {expandedCheckouts && (
                <>
                  <div className="text-muted-foreground">Stay Duration</div>
                  <div className="text-muted-foreground">Status</div>
                </>
              )}
            </div>
            <div className={cn(
              "overflow-y-auto",
              expandedCheckouts ? "max-h-[calc(100vh-400px)]" : "max-h-32"
            )}>
              {todayCheckouts.map((checkout, index) => {
                const checkoutTime = new Date(checkout.check_out_date || checkout.booking.expected_checkout);
                const checkinTime = new Date(checkout.check_in_date || checkout.booking.check_in);

                // Calculate stay duration in days
                const stayDuration = Math.round(
                  (checkoutTime.getTime() - checkinTime.getTime()) / (1000 * 60 * 60 * 24)
                );

                const now = new Date();
                const currentTime = new Date(
                  2025,
                  8,
                  9,
                  now.getHours(),
                  now.getMinutes()
                );
                const isLateCheckout = currentTime > checkoutTime;

                return (
                  <div
                    key={`${checkout.room_id}-${index}`}
                    className={cn(
                      "grid gap-1 text-xs py-1 border-t border-border",
                      expandedCheckouts ? "grid-cols-5" : "grid-cols-3",
                      isLateCheckout ? "bg-red-50" : "",
                      "hover:bg-muted/50 cursor-pointer"
                    )}
                    onClick={() => {
                      if (checkout.room) {
                        setSelectedRoom(checkout.room);
                      }
                    }}
                  >
                    <div className="font-medium">{checkout.room?.number || getRoomNameById(checkout.room_id)}</div>
                    <div className="truncate">{getGuestNameFromBooking(checkout.booking)}</div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        {checkoutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isLateCheckout && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500"
                            title="Late checkout"
                          />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Find room data and initiate checkout
                          if (checkout.room) {
                            handleRoomAction(checkout.room, "Check Out");
                          }
                        }}
                      >
                        <LogOut className="h-3 w-3" />
                      </Button>
                    </div>

                    {expandedCheckouts && (
                      <>
                        <div>
                          {stayDuration} {stayDuration === 1 ? 'day' : 'days'}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-sm text-[10px] uppercase font-medium",
                            isLateCheckout ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {isLateCheckout ? "Late" : "Pending"}
                          </span>

                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0.5"
                              title="View details"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Future implementation: view booking details
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-xs text-center mt-2 text-muted-foreground">
            No checkouts scheduled today
          </div>
        )}
      </div>

      {/* Dialog Components */}
      <CheckInDialog
        open={isCheckInDialogOpen}
        onOpenChange={setIsCheckInDialogOpen}
        bookings={bookings as any}
        onSuccess={refreshRooms}
      />

      {selectedBookingForCheckout && (
        <EnhancedCheckoutDialog
          booking={selectedBookingForCheckout}
          isOpen={isCheckOutDialogOpen}
          roomId={selectedRoomForCheckout?.id}
          onClose={() => {
            setIsCheckOutDialogOpen(false);
            setSelectedBookingForCheckout(null);
            setSelectedRoomForCheckout(null);
          }}
          onCheckoutSuccess={() => {
            refreshRooms();
            setIsCheckOutDialogOpen(false);
            setSelectedBookingForCheckout(null);
            setSelectedRoomForCheckout(null);
          }}
        />
      )}

      <NewReservationDialog
        open={isNewReservationDialogOpen}
        onOpenChange={setIsNewReservationDialogOpen}
        rooms={rooms}
        staff={staff}
        onSuccess={refreshRooms}
      />

      <HousekeepingDialog
        open={isHousekeepingDialogOpen}
        onOpenChange={setIsHousekeepingDialogOpen}
        rooms={[selectedRoom].filter(Boolean) as Room[]}
        staff={staff}
        onSuccess={refreshRooms}
      />
      <BlockRoomDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        room={selectedRoom}
        onSuccess={refreshRooms}
      />

      <CheckInInfoDialog
        open={isCheckInInfoDialogOpen}
        onOpenChange={setIsCheckInInfoDialogOpen}
        room={selectedRoom}
        onSuccess={refreshRooms}
      />

      <MaintenancePostingDialog
        open={isMaintenanceDialogOpen}
        onOpenChange={setIsMaintenanceDialogOpen}
        room={selectedRoom}
        onSuccess={refreshRooms}
      />

      <RoomCheckInDialog
        open={isRoomCheckInDialogOpen}
        onOpenChange={setIsRoomCheckInDialogOpen}
        room={selectedRoom}
        onSuccess={refreshRooms}
      />

      <RoomTransferDialog
        open={isRoomTransferDialogOpen}
        onOpenChange={(open) => {
          setIsRoomTransferDialogOpen(open);
          if (!open) {
            setSelectedBookingForTransfer(null);
          }
        }}
        bookingId={selectedBookingForTransfer?.id || ""}
        fromRoomId={selectedRoom?.id || ""}
        onSuccess={() => {
          refreshRooms();
          setSelectedBookingForTransfer(null);
        }}
      />

      {/* Change Pax/Tariff Dialog */}
      {selectedBookingForPaxTariff && selectedRoomForPaxTariff && (
        <ChangePaxTariffDialog
          open={isChangePaxTariffDialogOpen}
          onOpenChange={setIsChangePaxTariffDialogOpen}
          booking={selectedBookingForPaxTariff}
          bookingRoom={selectedBookingForPaxTariff.booking_rooms?.find(br => br.room_id === selectedRoomForPaxTariff.id)}
          onSuccess={() => {
            setIsChangePaxTariffDialogOpen(false)
            refreshRooms() // Refresh data
            // Force refresh check-in info if open
            if (isCheckInInfoDialogOpen) {
              setIsCheckInInfoDialogOpen(false)
              setTimeout(() => setIsCheckInInfoDialogOpen(true), 100)
            }
          }}
        />
      )}

      {/* Advance Posting Dialog */}
      {selectedBookingForAdvance && selectedRoomForAdvance && (
        <AdvancePostingDialog
          open={isAdvancePostingDialogOpen}
          onOpenChange={setIsAdvancePostingDialogOpen}
          booking={selectedBookingForAdvance}
          room={selectedRoomForAdvance}
          onSuccess={() => {
            setIsAdvancePostingDialogOpen(false)
            refreshRooms() // Refresh data
            // Force refresh check-in info if open
            if (isCheckInInfoDialogOpen) {
              setIsCheckInInfoDialogOpen(false)
              setTimeout(() => setIsCheckInInfoDialogOpen(true), 100)
            }
          }}
        />
      )}

      {/* Charges Posting Dialog */}
      {selectedBookingForCharges && selectedRoomForCharges && (
        <ChargesPostingDialog
          open={isChargesPostingDialogOpen}
          onOpenChange={setIsChargesPostingDialogOpen}
          booking={selectedBookingForCharges}
          room={selectedRoomForCharges}
          onSuccess={() => {
            setIsChargesPostingDialogOpen(false)
            refreshRooms() // Refresh data
            // Force refresh check-in info if open
            if (isCheckInInfoDialogOpen) {
              setIsCheckInInfoDialogOpen(false)
              setTimeout(() => setIsCheckInInfoDialogOpen(true), 100)
            }
          }}
        />
      )}
    </div>
  );
}
