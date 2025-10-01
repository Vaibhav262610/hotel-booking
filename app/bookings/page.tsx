"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarIcon,
  Grid,
  User,
  CreditCard,
  AlertCircle,
  Loader2,
  Upload,
  CheckCircle,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  differenceInDays,
  startOfDay,
  isBefore,
} from "date-fns";
import { cn } from "@/lib/utils";
import {
  bookingService,
  roomService,
  staffService,
  type Booking,
  type Room,
  type Staff,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useFormThemeStability } from "@/hooks/use-form-theme-stability";
import { useTaxCalculation } from "@/components/dashboard/hooks/use-tax-calculation";
import { EnhancedCheckoutDialog } from "@/components/checkout/enhanced-checkout-dialog";
import { FiltersBar } from "@/components/bookings/FiltersBar";
import { BookingTable } from "@/components/bookings/BookingTable";
import { CalendarView } from "@/components/bookings/CalendarView";
import { DayViewDialog } from "@/components/bookings/DayViewDialog";
import { CreateBookingDialog } from "@/components/bookings/CreateBookingDialog";
import { ViewBookingDialog } from "@/components/bookings/ViewBookingDialog";
import { EditBookingDialog } from "@/components/bookings/EditBookingDialog";
import { DeleteBookingDialog } from "@/components/bookings/DeleteBookingDialog";

interface BookingFormData {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  roomId: string;
  staffId: string;
  checkInDate: Date | undefined;
  checkOutDate: Date | undefined;
  totalAmount: number;
  advanceAmount: number;
  specialRequests: string;
  numberOfGuests: number;
  childGuests: number;
  extraGuests: number;
  arrivalType: string;
  mealPlan: string;
  planName: string;
  purpose: string;
  otaCompany: string;
}

interface TaxBreakdown {
  subtotal: number;
  gst: number;
  cgst: number;
  sgst: number;
  luxuryTax: number;
  serviceCharge: number;
  totalTax: number;
  grandTotal: number;
  nights: number;
}

export default function BookingsPage() {
  const { startSubmission, endSubmission } = useFormThemeStability();
  const { calculateHotelTaxes } = useTaxCalculation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDayViewDialogOpen, setIsDayViewDialogOpen] = useState(false);
  const [isEnhancedCheckoutDialogOpen, setIsEnhancedCheckoutDialogOpen] =
    useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedDateBookings, setSelectedDateBookings] = useState<Booking[]>(
    []
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState<BookingFormData>({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    roomId: "",
    staffId: "",
    checkInDate: undefined,
    checkOutDate: undefined,
    totalAmount: 0,
    advanceAmount: 0,
    specialRequests: "",
    numberOfGuests: 1,
    childGuests: 0,
    extraGuests: 0,
    arrivalType: "walk_in",
    mealPlan: "EP",
    planName: "STD",
    purpose: "",
    otaCompany: "",
  });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [taxCalculation, setTaxCalculation] = useState<any>(null);
  const [roomAvailabilityStatus, setRoomAvailabilityStatus] = useState<{
    available: boolean;
    message: string;
    checking: boolean;
  } | null>(null);

  // Split payment states
  const [splitPaymentData, setSplitPaymentData] = useState({
    advanceMethod: "",
    remainingMethod: "",
    advanceAmount: 0,
    remainingAmount: 0,
    paymentType: "full" as "full" | "advance" | "checkout", // full, advance-only, or checkout-remaining
  });

  const { toast } = useToast();

  // ID upload handler (placeholder for future OCR implementation)
  const handleIdUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, just show a success message
    // In the future, this can be connected to an OCR service
    toast({
      title: "ID Uploaded",
      description:
        "ID card uploaded successfully. OCR processing will be available soon.",
    });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Fetching data...");
        const [bookingsData, roomsData, staffData] = await Promise.all([
          bookingService.getBookings(),
          roomService.getRooms(),
          staffService.getStaff(),
        ]);

        console.log("Data fetched successfully:", {
          bookings: bookingsData.length,
          rooms: roomsData.length,
          staff: staffData.length,
        });

        setBookings(bookingsData);
        setRooms(roomsData);
        setStaff(staffData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Error",
          description:
            "Failed to load data. Please check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  useEffect(() => {
    if (formData.checkInDate && formData.checkOutDate) {
      // Check room availability for selected room and dates
      if (formData.roomId) {
        checkRoomAvailability(
          formData.roomId,
          formData.checkInDate,
          formData.checkOutDate
        );
      }

      // Calculate comprehensive hotel taxes if room is selected
      if (formData.roomId) {
        const room = rooms.find((r) => r.id === formData.roomId);
        if (room) {
          const nights = Math.max(
            1,
            differenceInDays(formData.checkOutDate, formData.checkInDate)
          );
          // Use dynamic tax calculation from hook
          const taxCalculation = calculateHotelTaxes(room.price, nights);

          setFormData((prev) => ({ ...prev, totalAmount: taxCalculation.grandTotal }));
          setTaxCalculation(taxCalculation);
        }
      }
    }
  }, [formData.checkInDate, formData.checkOutDate, formData.roomId, rooms, calculateHotelTaxes]);

  // Effect to update advance amounts when tax calculation changes
  useEffect(() => {
    if (taxCalculation) {
      if (splitPaymentData.paymentType === "full") {
        // For full payment, set advance amount to total amount
        setSplitPaymentData((prev) => ({
          ...prev,
          advanceAmount: taxCalculation.grandTotal,
          remainingAmount: 0,
        }));
      } else if (
        splitPaymentData.paymentType === "advance" ||
        splitPaymentData.paymentType === "checkout"
      ) {
        // Update remaining amount based on current advance amount
        const currentAdvance = splitPaymentData.advanceAmount;
        const newRemaining = taxCalculation.grandTotal - currentAdvance;

        setSplitPaymentData((prev) => ({
          ...prev,
          remainingAmount: newRemaining > 0 ? newRemaining : 0,
        }));
      }
    }
  }, [taxCalculation, splitPaymentData.paymentType]);

  // Handle room selection
  const handleRoomChange = (roomId: string) => {
    setFormData((prev) => ({ ...prev, roomId }));

    // If dates are already selected, check availability
    if (roomId && formData.checkInDate && formData.checkOutDate) {
      checkRoomAvailability(
        roomId,
        formData.checkInDate,
        formData.checkOutDate
      );
    }
  };

  // Separate effect to show "select room" toast only when dates are selected but no room is chosen
  useEffect(() => {
    if (formData.checkInDate && formData.checkOutDate && !formData.roomId) {
      // Only show this toast if both dates are selected but no room is selected
      toast({
        title: "Dates Selected",
        description:
          "Please select a room to check availability for the chosen dates.",
        variant: "default",
      });
    }
  }, [formData.checkInDate, formData.checkOutDate, formData.roomId]);

  const checkRoomAvailability = async (
    roomId: string,
    checkIn: Date,
    checkOut: Date
  ) => {
    setRoomAvailabilityStatus({
      available: false,
      message: "",
      checking: true,
    });

    try {
      console.log("Checking room availability for:", {
        roomId,
        checkIn,
        checkOut,
      });
      const availability = await bookingService.checkRoomAvailability(
        roomId,
        checkIn,
        checkOut
      );
      console.log("Room availability result:", availability);

      setRoomAvailabilityStatus({
        available: availability.available,
        message: availability.message || "",
        checking: false,
      });

      if (availability.available) {
        toast({
          title: "Room Available",
          description: "The selected room is available for the chosen dates.",
          variant: "default",
        });
      } else {
        toast({
          title: "Room Not Available",
          description:
            availability.message ||
            "The selected room is not available for the chosen dates.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking room availability:", error);
      setRoomAvailabilityStatus({
        available: false,
        message: "Unable to check room availability",
        checking: false,
      });
      toast({
        title: "Error",
        description: "Unable to check room availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      guestName: "",
      guestPhone: "",
      guestEmail: "",
      roomId: "",
      staffId: "",
      checkInDate: undefined,
      checkOutDate: undefined,
      totalAmount: 0,
      advanceAmount: 0,
      specialRequests: "",
      numberOfGuests: 1,
      childGuests: 0,
      extraGuests: 0,
      arrivalType: "walk_in",
      mealPlan: "EP",
      planName: "STD",
      purpose: "",
      otaCompany: "",
    });
    setSelectedRoom(null);
    setFormErrors({});
    setTaxCalculation(null);
    setRoomAvailabilityStatus(null);
    setSplitPaymentData({
      advanceMethod: "",
      remainingMethod: "",
      advanceAmount: 0,
      remainingAmount: 0,
      paymentType: "full",
    });
  };



  const handleUpdateBooking = async (roomData: any[]) => {
    if (!selectedBooking) return;

    try {
      startSubmission(); 

      const updatedData = {
        ...formData,
        checkInDate: formData.checkInDate!,
        checkOutDate: formData.checkOutDate!,
        roomData: roomData
      };

      await bookingService.updateBooking(selectedBooking.id, updatedData);

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });

      // Refresh bookings
      const updatedBookings = await bookingService.getBookings();
      setBookings(updatedBookings);

      setIsEditDialogOpen(false);
      setSelectedBooking(null);
      resetForm();
    } catch (error) {
      console.error("Update error:", error);
      
      // Check if it's a room-specific error
      if (error instanceof Error && error.message.includes("Room update errors:")) {
        const roomErrors = error.message.replace("Room update errors: ", "").split("; ");
        
        // Show individual error toasts for each room error
        roomErrors.forEach((roomError, index) => {
          setTimeout(() => {
            toast({
              title: "Room Update Error",
              description: roomError.trim(),
              variant: "destructive",
            });
          }, index * 100); // Stagger the toasts slightly
        });
        
        // Still show success for the main booking update
        toast({
          title: "Partial Success",
          description: "Booking updated, but some room changes failed. Check individual room errors above.",
        });
        
        // Refresh bookings even with partial errors
        try {
          const updatedBookings = await bookingService.getBookings();
          setBookings(updatedBookings);
        } catch (refreshError) {
          console.error("Error refreshing bookings:", refreshError);
        }
      } else {
        // General booking update error
      toast({
        title: "Error",
          description: `Failed to update booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      }
    } finally {
      endSubmission(); // Allow theme changes after submission
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!selectedBooking) return;

    try {
      setIsDeleting(bookingId);
      startSubmission(); // Prevent theme switching during submission
      
      await bookingService.deleteBooking(bookingId);

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });

      // Refresh bookings
      const updatedBookings = await bookingService.getBookings();
      setBookings(updatedBookings);

      setIsDeleteDialogOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Cancel error:", error);
      toast({
        title: "Error",
        description: `Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
      endSubmission(); // Allow theme changes after submission
    }
  };

  const openEditDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    
    // Get primary room data from booking_rooms
    const primaryRoom = booking.booking_rooms?.[0];
    
    setFormData({
      guestName: booking.guest?.name || "",
      guestPhone: booking.guest?.phone || "",
      guestEmail: booking.guest?.email || "",
      roomId: primaryRoom?.room_id || "",
      staffId: booking.staff_id || "",
      checkInDate: primaryRoom ? new Date(primaryRoom.check_in_date) : new Date(booking.check_in),
      checkOutDate: primaryRoom ? new Date(primaryRoom.check_out_date) : new Date(booking.expected_checkout),
      totalAmount: booking.payment_breakdown?.total_amount || 0,
      advanceAmount: booking.payment_breakdown?.advance_cash || 0,
      specialRequests: booking.special_requests || "",
      numberOfGuests: booking.number_of_guests || 1,
      childGuests: booking.child_guests || 0,
      extraGuests: booking.extra_guests || 0,
      arrivalType: booking.arrival_type || "walk_in",
      mealPlan: booking.meal_plan || "EP",
      planName: booking.plan_name || "STD",
      purpose: booking.purpose || "",
      otaCompany: booking.ota_company || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (bookingId: string) => {
    // Find the booking by ID
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setIsDeleteDialogOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: "bg-blue-100 text-blue-800", label: "Confirmed" },
      checked_in: { color: "bg-green-100 text-green-800", label: "Checked In" },
      checked_out: { color: "bg-gray-100 text-gray-800", label: "Checked Out" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      reserved: { color: "bg-yellow-100 text-yellow-800", label: "Reserved" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.confirmed;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "checked_in":
        return "secondary";
      case "checked_out":
        return "outline";
      case "cancelled":
        return "destructive";
      case "reserved":
        return "secondary";
      default:
        return "default";
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      startSubmission(); // Prevent theme switching during submission
      setIsCheckingIn(bookingId);
      await bookingService.checkIn(bookingId);

      toast({
        title: "Success",
        description: "Guest checked in successfully",
      });

      // Refresh bookings
      const updatedBookings = await bookingService.getBookings();
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Error checking in guest:", error);
      toast({
        title: "Error",
        description: `Error checking in guest: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(null);
      endSubmission(); // Allow theme changes after submission
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      startSubmission(); // Prevent theme switching during submission
      setIsCheckingOut(bookingId);
      await bookingService.checkOut(bookingId, new Date(), {
        earlyCheckoutReason: "",
        priceAdjustment: 0,
        finalAmount: 0,
        adjustmentReason: "",
        remainingBalance: 0,
        remainingBalanceCollectedBy: "",
        remainingBalancePaymentMethod: ""
      });

      toast({
        title: "Success",
        description: "Guest checked out successfully",
      });

      // Refresh bookings
      const updatedBookings = await bookingService.getBookings();
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Error checking out guest:", error);
      toast({
        title: "Error",
        description: `Error checking out guest: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(null);
      endSubmission(); // Allow theme changes after submission
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guest?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_rooms?.some(room => 
        room.room?.number?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const currentStatus = booking.room_status || booking.status;
    const matchesStatus =
      filterStatus === "all" || currentStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const getBookingsForDay = (date: Date) => {
    return bookings.filter((booking) => {
      const checkIn = parseISO(booking.check_in);
      const checkOut = booking.expected_checkout ? parseISO(booking.expected_checkout) : null;
      return (
        isSameDay(checkIn, date) ||
        (checkOut && isSameDay(checkOut, date)) ||
        (checkIn < date && checkOut && checkOut > date)
      );
    });
  };

  const openDayViewDialog = (date: Date) => {
    const dayBookings = getBookingsForDay(date);
    setSelectedDate(date);
    setSelectedDateBookings(dayBookings);
    setIsDayViewDialogOpen(true);
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">
            Manage hotel bookings, check-ins, and check-outs
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <FiltersBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              onOpenCreate={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>
                  Showing {filteredBookings.length} of {bookings.length} bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BookingTable
                  bookings={filteredBookings}
                  onEdit={openEditDialog}
                  onCancel={openDeleteDialog}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  isCheckingInId={isCheckingIn}
                  isCheckingOutId={isCheckingOut}
                  isDeletingId={isDeleting}
                  getStatusVariant={getStatusVariant}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <CalendarView
              currentMonth={currentMonth}
              days={days}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              getBookingsForDay={getBookingsForDay}
              onOpenDay={openDayViewDialog}
            />
          </TabsContent>
        </Tabs>

        {/* View Booking Dialog */}
        <ViewBookingDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          booking={selectedBooking}
          getStatusBadge={getStatusBadge}
        />

        {/* Edit Booking Dialog */}
        <EditBookingDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          formData={formData}
          setFormData={setFormData as any}
          rooms={rooms as any}
          staff={staff as any}
          handleRoomChange={handleRoomChange}
          onSave={handleUpdateBooking}
          selectedBooking={selectedBooking}
        />

        {/* Cancel Confirmation Dialog */}
        <DeleteBookingDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          guestName={selectedBooking?.guest?.name}
          onConfirm={() => selectedBooking && handleDeleteBooking(selectedBooking.id)}
        />

        {/* Day View Dialog */}
        <DayViewDialog
          isOpen={isDayViewDialogOpen}
          onOpenChange={setIsDayViewDialogOpen}
          selectedDate={selectedDate}
          bookings={selectedDateBookings}
          getStatusBadge={getStatusBadge}
        />

        {/* Enhanced Checkout Dialog */}
        {selectedBooking && (
          <EnhancedCheckoutDialog
            booking={selectedBooking}
            isOpen={isEnhancedCheckoutDialogOpen}
            onClose={() => {
              setIsEnhancedCheckoutDialogOpen(false);
              setSelectedBooking(null);
            }}
            onCheckoutSuccess={() => {
              // Refresh bookings after checkout
              loadBookings();
              setIsEnhancedCheckoutDialogOpen(false);
              setSelectedBooking(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
