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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus,
  Edit,
  Trash2,
  Eye,
  CalendarIcon,
  Grid,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  User,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { bookingService, roomService, staffService, type Room, type Staff } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const statusConfig = {
  confirmed: {
    variant: "default" as const,
    label: "Confirmed",
    icon: CheckCircle,
  },
  pending: { variant: "secondary" as const, label: "Pending", icon: Clock },
  cancelled: {
    variant: "destructive" as const,
    label: "Cancelled",
    icon: Trash2,
  },
  "checked-in": {
    variant: "outline" as const,
    label: "Checked In",
    icon: CheckCircle,
  },
};

export default function ReservationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDayViewDialogOpen, setIsDayViewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [roomsModalData, setRoomsModalData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateReservations, setSelectedDateReservations] = useState<any[]>([]);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    guestName: "",
    phone: "",
    email: "",
    totalAmount: 0,
    advanceAmount: 0,
    paymentMethod: "",
    status: "",
    specialRequests: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsData, roomsData, staffData] = await Promise.all([
          bookingService.getBookings(),
          roomService.getRooms(),
          staffService.getStaff(),
        ]);
        setBookings(bookingsData);
        setRooms(roomsData);
        setStaff(staffData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  const handleBackfillBookings = async () => {
    try {
      setIsBackfilling(true)
      console.log('Starting backfill...')
      
      const response = await fetch('/api/backfill-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message || 'Bookings backfilled successfully!',
        })
        // Reload bookings to show updated amounts
        const bookingsData = await bookingService.getBookings()
        setBookings(bookingsData)
      } else {
        toast({
          title: "Error",
          description: result.error || 'Backfill failed',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Backfill error:', error)
      toast({
        title: "Error",
        description: 'Failed to backfill bookings',
        variant: "destructive",
      })
    } finally {
      setIsBackfilling(false)
    }
  }

  // Build table rows as one-per-booking; calendar uses per-room flattened later
  const bookingRows = bookings.map((b: any) => ({
    booking: b,
    rooms: (b.booking_rooms || []).map((br: any) => br.room?.number).filter(Boolean)
  }));
  const filteredReservations = bookingRows.filter(({ booking, rooms }) => {
    const matchesSearch =
      booking.guest?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rooms.some((n: string) => n?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calendar view data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const flattened = bookings.flatMap((b: any) =>
    (b.booking_rooms || []).map((br: any) => ({ booking: b, br }))
  );
  const getReservationsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return flattened.filter(({ br }) => {
      if (!br.check_in_date) return false;
      // Only mark calendar on the actual check-in date
      return br.check_in_date.slice(0, 10) === dayStr;
    });
  };

  const handleViewReservation = (row: any) => {
    setSelectedBooking(row);
    setIsViewDialogOpen(true);
  };

  const handleEditReservation = (row: any) => {
    setSelectedBooking(row);
    setCheckInDate(parseISO(row.br?.check_in_date || row.booking.check_in));
    setCheckOutDate(parseISO(row.br?.check_out_date || row.booking.expected_checkout));

    // Populate edit form data
    setEditFormData({
      guestName: row.booking.guest?.name || "",
      phone: row.booking.guest?.phone || "",
      email: row.booking.guest?.email || "",
      totalAmount: row.booking.payment_breakdown?.total_amount || 0,
      advanceAmount: 0,
      paymentMethod: row.booking.payment_method_pref || "",
      status: row.booking.status,
      specialRequests: row.booking.special_requests || "",
    });

    setIsEditDialogOpen(true);
  };

  const handleDeleteReservation = (row: any) => {
    setSelectedBooking(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteReservation = async () => {
    if (!selectedBooking) return;

    try {
      // Here you would call the delete API
      // await reservationService.deleteReservation(selectedReservation.id)

      setBookings((prev) => prev.filter((b: any) => b.id !== selectedBooking.booking.id));
      toast({
        title: "Success",
        description: "Reservation deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reservation",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedBooking(null);
    }
  };

  const handleDayClick = (day: Date) => {
    const dayReservations = getReservationsForDay(day);
    setSelectedDate(day);
    setSelectedDateReservations(dayReservations);
    setIsDayViewDialogOpen(true);
  };

  const handleUpdateReservation = async () => {
    if (!selectedBooking) return;

    try {
      // Update guest information
      if (selectedBooking.booking.guest?.id) {
        const { error: guestError } = await supabase
          .from("guests")
          .update({
            name: editFormData.guestName,
            phone: editFormData.phone,
            email: editFormData.email,
          })
          .eq("id", selectedBooking.booking.guest.id);

        if (guestError) throw guestError;
      }

      // Update reservation information
      const { error: reservationError } = await supabase
        .from("bookings")
        .update({
          status: editFormData.status,
          special_requests: editFormData.specialRequests,
          payment_method_pref: editFormData.paymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBooking.booking.id);

      if (reservationError) throw reservationError;

      // Update local state
      setBookings((prev:any[]) => prev.map((b:any) => (
        b.id === selectedBooking.booking.id
          ? {
              ...b,
              status: editFormData.status,
              special_requests: editFormData.specialRequests,
              payment_method_pref: editFormData.paymentMethod,
              guest: {
                ...b.guest,
                name: editFormData.guestName,
                phone: editFormData.phone,
                email: editFormData.email,
              },
            }
          : b
      )));

      toast({
        title: "Success",
        description: "Reservation updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast({
        title: "Error",
        description: "Failed to update reservation",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-lg text-muted-foreground">
            Loading reservations...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Reservation Management
            </h1>
            <p className="text-muted-foreground">
              Manage hotel reservations and advance bookings
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleBackfillBookings}
              disabled={isBackfilling}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isBackfilling ? 'animate-spin' : ''}`} />
              {isBackfilling ? 'Backfilling...' : 'Fix Amounts'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Total Reservations
              </CardTitle>
              <CalendarIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {flattened.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Confirmed
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {bookings.filter((b) => b.status === "confirmed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Pending
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {bookings.filter((b) => b.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Total Value
              </CardTitle>
              <CalendarIcon className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ₹
                {bookings
                  .reduce((sum, b) => sum + (b.payment_breakdown?.total_amount || 0), 0)
                  .toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reservation Views */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Reservations</CardTitle>
            <CardDescription>
              View reservations in table or calendar format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="table">
                    <Grid className="w-4 h-4 mr-2" />
                    Table View
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Calendar View
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-4">
                  <Input
                    placeholder="Search reservations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[300px]"
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="checked-in">Checked In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">
                        Reservation ID
                      </TableHead>
                      <TableHead className="text-foreground">Guest</TableHead>
                      <TableHead className="text-foreground">Room</TableHead>
                      <TableHead className="text-foreground">
                        Check-in
                      </TableHead>
                      <TableHead className="text-foreground">
                        Check-out
                      </TableHead>
                      <TableHead className="text-foreground">
                        Arrival Type
                      </TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Amount</TableHead>
                      <TableHead className="text-foreground">Advance</TableHead>
                      <TableHead className="text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map(({ booking, rooms }) => {
                      const StatusIcon =
                        statusConfig[booking.status as keyof typeof statusConfig]?.icon || CheckCircle;
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium text-foreground">
                            {booking.booking_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">
                                {booking.guest?.name || "Unknown"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.guest?.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">
                                {rooms && rooms.length > 0 ? rooms.slice(0,2).join(", ") : "-"}
                                {rooms && rooms.length > 2 && (
                                  <>
                                    {" "}
                                    <button
                                      className="text-xs underline text-blue-600"
                                      onClick={(e)=>{e.stopPropagation(); setRoomsModalData(booking.booking_rooms || []); setIsRoomsModalOpen(true);}}
                                    >
                                      +{rooms.length - 2} more
                                    </button>
                                  </>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.booking_rooms?.[0]?.room?.room_type?.code || booking.booking_rooms?.[0]?.room?.room_type?.name || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground">
                            {booking.booking_rooms?.[0]?.check_in_date ? format(parseISO(booking.booking_rooms?.[0]?.check_in_date), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {booking.booking_rooms?.[0]?.check_out_date ? format(parseISO(booking.booking_rooms?.[0]?.check_out_date), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-foreground">
                            <Badge variant="outline">
                              {booking.arrival_type || "Walk-in"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                statusConfig[booking.status as keyof typeof statusConfig]?.variant || "outline"
                              }
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[booking.status as keyof typeof statusConfig]?.label || booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground">
                            ₹{(
                              booking.payment_breakdown?.taxed_total_amount ||
                              booking.payment_breakdown?.total_amount ||
                              0
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {(() => {
                              const b = booking.payment_breakdown || {}
                              const adv = Number(b.advance_cash||0)+Number(b.advance_card||0)+Number(b.advance_upi||0)+Number(b.advance_bank||0)
                              return `₹${adv.toLocaleString()}`
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewReservation({ booking })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditReservation({ booking })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteReservation({ booking })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="calendar">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {format(currentMonth, "MMMM yyyy")}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() - 1
                            )
                          )
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentMonth(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1
                            )
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={day}
                          className="p-2 text-center font-medium text-sm text-muted-foreground"
                        >
                          {day}
                        </div>
                      )
                    )}

                    {monthDays.map((day) => {
                      const dayReservations = getReservationsForDay(day);
                      return (
                        <div
                          key={day.toISOString()}
                          className="min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                          onClick={() => handleDayClick(day)}
                        >
                          <div className="text-sm font-medium mb-1">
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {dayReservations.slice(0, 3).map(({ booking, br }) => (
                              <div
                                key={`${booking.id}-${br.id}`}
                                className="text-xs p-1 rounded bg-green-100 text-green-800 truncate"
                                title={`${booking.guest?.name || ''} - Room ${br.room?.number || ''}`}
                              >
                                {(booking.guest?.name || 'Guest')} - {br.room?.number || 'Room'}
                              </div>
                            ))}
                            {dayReservations.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayReservations.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

      {/* Rooms list dialog (uses shared Dialog component) */}
      <Dialog open={isRoomsModalOpen} onOpenChange={setIsRoomsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Rooms in this booking</DialogTitle>
            <DialogDescription>
              All rooms attached to this reservation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {roomsModalData && roomsModalData.length > 0 ? (
              roomsModalData.map((br: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <div className="font-medium text-foreground">{br.room?.number || '-'}</div>
                    <div className="text-muted-foreground">
                      {br.room?.room_type?.code || br.room?.room_type?.name || '-'}
                    </div>
                  </div>
                  <div className="text-right text-muted-foreground">
                    <div>{br.check_in_date ? format(parseISO(br.check_in_date), 'MMM dd, yyyy') : '-'}</div>
                    <div>{br.check_out_date ? format(parseISO(br.check_out_date), 'MMM dd, yyyy') : '-'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">No rooms found for this booking.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
            </Tabs>
          </CardContent>
        </Card>

        {/* View Reservation Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Reservation Details</DialogTitle>
              <DialogDescription>
                Complete information about this reservation
              </DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Guest Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Name
                        </Label>
                        <p className="font-medium">
                          {selectedBooking.booking.guest?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Phone
                        </Label>
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedBooking.booking.guest?.phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Email
                        </Label>
                        <p className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedBooking.booking.guest?.email || "N/A"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Reservation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Reservation ID
                        </Label>
                        <p className="font-medium">
                          {selectedBooking.booking.booking_number}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Room
                        </Label>
                        <p>
                          {(selectedBooking.booking?.booking_rooms?.map((br: any)=> br.room?.number).filter(Boolean).join(', ') || '-')}
                          {" "}
                          {selectedBooking.booking?.booking_rooms?.[0]?.room?.room_type?.code || selectedBooking.booking?.booking_rooms?.[0]?.room?.room_type?.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Status
                        </Label>
                        <Badge
                          variant={statusConfig[selectedBooking.booking.status as keyof typeof statusConfig]?.variant || "outline"}
                        >
                          {statusConfig[selectedBooking.booking.status as keyof typeof statusConfig]?.label || selectedBooking.booking.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payment Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Amount</Label>
                        <p className="font-medium text-lg">₹{(
                          selectedBooking.booking.payment_breakdown?.taxed_total_amount ||
                          selectedBooking.booking.payment_breakdown?.total_amount || 0
                        ).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Advance Paid
                        </Label>
                        <p>{(() => {
                          const b = selectedBooking.booking.payment_breakdown || {}
                          const adv = Number(b.advance_cash||0)+Number(b.advance_card||0)+Number(b.advance_upi||0)+Number(b.advance_bank||0)
                          return `₹${adv.toLocaleString()}`
                        })()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Remaining
                        </Label>
                        <p className="font-medium">
                          ₹{(
                            selectedBooking.booking.payment_breakdown?.outstanding_amount || 0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Payment Method
                        </Label>
                        <p>{selectedBooking.booking.payment_method_pref || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Stay Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Check-in
                        </Label>
                        <p>
                          {selectedBooking.booking?.booking_rooms?.[0]?.check_in_date ? format(parseISO(selectedBooking.booking?.booking_rooms?.[0]?.check_in_date), "PPP") : '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Check-out
                        </Label>
                        <p>
                          {selectedBooking.booking?.booking_rooms?.[0]?.check_out_date ? format(parseISO(selectedBooking.booking?.booking_rooms?.[0]?.check_out_date), "PPP") : '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Arrival Type
                        </Label>
                        <p>{selectedBooking.booking.arrival_type}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Assigned Staff
                        </Label>
                        <p>{selectedBooking.booking.staff?.name || "N/A"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedBooking.booking.special_requests && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Special Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {selectedBooking.booking.special_requests}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Reservation Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Reservation</DialogTitle>
              <DialogDescription>
                Update reservation information
              </DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-guest-name">Guest Name</Label>
                    <Input
                      id="edit-guest-name"
                      value={editFormData.guestName}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          guestName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editFormData.phone}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) =>
                        setEditFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="checked-in">Checked In</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={editFormData.paymentMethod}
                      onValueChange={(value) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          paymentMethod: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank-transfer">
                          Bank Transfer
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount">Total Amount</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      value={editFormData.totalAmount}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          totalAmount: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-advance">Advance</Label>
                    <Input
                      id="edit-advance"
                      type="number"
                      value={editFormData.advanceAmount}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          advanceAmount: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-special-requests">
                    Special Requests
                  </Label>
                  <Textarea
                    id="edit-special-requests"
                    value={editFormData.specialRequests}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        specialRequests: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateReservation}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
         <AlertDialog
           open={isDeleteDialogOpen}
           onOpenChange={setIsDeleteDialogOpen}
         >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
              <AlertDialogDescription>
                 Are you sure you want to delete reservation {selectedBooking?.booking?.booking_number}? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteReservation}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Day View Dialog */}
        <Dialog
          open={isDayViewDialogOpen}
          onOpenChange={setIsDayViewDialogOpen}
        >
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>
                Reservations for {selectedDate && format(selectedDate, "PPPP")}
              </DialogTitle>
              <DialogDescription>
                {selectedDateReservations.length} reservation(s) found for this
                date
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {selectedDateReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reservations found for this date
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateReservations.map(({ booking, br }) => (
                    <Card key={`${booking.id}-${br.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <h4 className="font-medium">
                                {booking.guest?.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Room {br.room?.number} • {booking.booking_number}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {br.check_in_date ? format(parseISO(br.check_in_date), 'MMM dd') : '-'} - {br.check_out_date ? format(parseISO(br.check_out_date), 'MMM dd') : '-'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                statusConfig[booking.status as keyof typeof statusConfig]?.variant || "outline"
                              }
                            >
                              {statusConfig[booking.status as keyof typeof statusConfig]?.label || booking.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setIsDayViewDialogOpen(false);
                                handleViewReservation({ booking, br });
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

         {/* Upcoming Reservations (next 7 days) */}
         <Card>
           <CardHeader>
             <CardTitle className="text-foreground">Upcoming Reservations</CardTitle>
             <CardDescription>Reservations arriving in the next 7 days</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {flattened
                 .filter(({ booking, br }) => booking.status === 'confirmed' && br.check_in_date && parseISO(br.check_in_date) >= new Date())
                 .slice(0, 3)
                 .map(({ booking, br }) => (
                   <div key={`${booking.id}-${br.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                     <div className="flex items-center gap-4">
                       <div className="text-center">
                         <div className="text-2xl font-bold text-foreground">{br.check_in_date ? format(parseISO(br.check_in_date), 'dd') : '-'}</div>
                         <div className="text-sm text-muted-foreground">{br.check_in_date ? format(parseISO(br.check_in_date), 'MMM') : '-'}</div>
                       </div>
                       <div>
                         <div className="font-medium text-foreground">{booking.guest?.name}</div>
                         <div className="text-sm text-muted-foreground">Room {br.room?.number} • {br.room?.room_type?.code || br.room?.room_type?.name}</div>
                         <div className="text-sm text-muted-foreground">{br.check_in_date ? format(parseISO(br.check_in_date), 'MMM dd') : '-'} - {br.check_out_date ? format(parseISO(br.check_out_date), 'MMM dd') : '-'}</div>
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="font-medium text-foreground">₹{(booking.payment_breakdown?.total_amount || 0).toLocaleString()}</div>
                     </div>
                   </div>
                 ))}
             </div>
           </CardContent>
         </Card>
      </div>
    </DashboardLayout>
  );
}
