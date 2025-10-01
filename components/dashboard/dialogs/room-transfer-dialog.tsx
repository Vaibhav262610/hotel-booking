"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowRightLeft, 
  User, 
  Building, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { RoomTransferService, type AvailableRoom, type TransferHistory } from "@/lib/room-transfer-service";
import { staffService, type Staff } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface RoomTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  fromRoomId: string;
  onSuccess?: () => void;
}

interface TransferFormData {
  toRoomId: string;
  reason: string;
  transferStaffId: string;
  notifyGuest: boolean;
  notifyHousekeeping: boolean;
  notes: string;
}

export function RoomTransferDialog({
  open,
  onOpenChange,
  bookingId,
  fromRoomId,
  onSuccess,
}: RoomTransferDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);

  const [formData, setFormData] = useState<TransferFormData>({
    toRoomId: "",
    reason: "",
    transferStaffId: "",
    notifyGuest: true,
    notifyHousekeeping: true,
    notes: "",
  });

  const transferReasons = RoomTransferService.getTransferReasons();

  // Load data when dialog opens
  useEffect(() => {
    if (open && bookingId) {
      loadData();
    }
  }, [open, bookingId]);

  const loadData = async () => {
    setIsLoadingBooking(true);
    setIsLoadingRooms(true);
    
    try {
      const [staff, bookingData, rooms, history] = await Promise.all([
        staffService.getStaff(),
        RoomTransferService.getBookingForTransfer(bookingId),
        RoomTransferService.getAvailableRooms(bookingId, fromRoomId),
        RoomTransferService.getTransferHistory(bookingId)
      ]);

      setStaffList(staff);
      setBooking(bookingData);
      setAvailableRooms(rooms);
      setTransferHistory(history);

      // Set default staff member
      if (staff.length > 0) {
        setFormData(prev => ({
          ...prev,
          transferStaffId: staff[0].id
        }));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load transfer data.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBooking(false);
      setIsLoadingRooms(false);
    }
  };

  const handleInputChange = (field: keyof TransferFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update selected room when room selection changes
    if (field === 'toRoomId') {
      const room = availableRooms.find(r => r.id === value);
      setSelectedRoom(room || null);
    }
  };

  const handleTransfer = async () => {
    if (!formData.toRoomId || !formData.reason || !formData.transferStaffId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await RoomTransferService.processTransfer({
        fromRoomId,
        toRoomId: formData.toRoomId,
        bookingId,
        reason: formData.reason,
        transferStaffId: formData.transferStaffId,
        notifyGuest: formData.notifyGuest,
        notifyHousekeeping: formData.notifyHousekeeping,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Transfer failed");
      }
    } catch (error) {
      console.error("Transfer error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process transfer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoom = booking?.booking_rooms?.find((br: any) => br.room_id === fromRoomId)?.room;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6" />
            Room Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer guest to a different room
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Booking Information */}
          {booking && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Booking Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Guest Name</Label>
                    <p className="font-medium">{booking.guest?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Booking Number</Label>
                    <p className="font-medium">{booking.booking_number || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Current Room</Label>
                    <p className="font-medium">{currentRoom?.number || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Room Type</Label>
                    <p className="font-medium">{currentRoom?.room_type?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Check-in Date</Label>
                    <p className="font-medium">
                      {booking.booking_rooms?.[0]?.check_in_date 
                        ? format(new Date(booking.booking_rooms[0].check_in_date), "dd/MM/yyyy")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Check-out Date</Label>
                    <p className="font-medium">
                      {booking.booking_rooms?.[0]?.check_out_date 
                        ? format(new Date(booking.booking_rooms[0].check_out_date), "dd/MM/yyyy")
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transfer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Transfer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Target Room *</Label>
                  {isLoadingRooms ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading available rooms...</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.toRoomId}
                      onValueChange={(value) => handleInputChange('toRoomId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target room" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>Room {room.number}</span>
                              <Badge variant="outline" className="ml-2">
                                {room.room_type.name}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {availableRooms.length === 0 && !isLoadingRooms && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No available rooms found for transfer
                    </p>
                  )}
                </div>

                <div>
                  <Label>Transfer Reason *</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value) => handleInputChange('reason', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {transferReasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Transfer By *</Label>
                  <Select
                    value={formData.transferStaffId}
                    onValueChange={(value) => handleInputChange('transferStaffId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any additional notes about this transfer..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selected Room Details & Notifications */}
            <div className="space-y-4">
              {/* Selected Room Details */}
              {selectedRoom && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Target Room Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Room Number:</span>
                        <Badge variant="outline">Room {selectedRoom.number}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Room Type:</span>
                        <span>{selectedRoom.room_type.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Status:</span>
                        <Badge variant="default" className="bg-green-500">
                          Available
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Base Price:</span>
                        <span>₹{selectedRoom.room_type.base_price}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyGuest"
                      checked={formData.notifyGuest}
                      onCheckedChange={(checked) => handleInputChange('notifyGuest', checked)}
                    />
                    <Label htmlFor="notifyGuest">Notify Guest</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyHousekeeping"
                      checked={formData.notifyHousekeeping}
                      onCheckedChange={(checked) => handleInputChange('notifyHousekeeping', checked)}
                    />
                    <Label htmlFor="notifyHousekeeping">Notify Housekeeping</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Transfer History */}
          {transferHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Transfer History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transferHistory.map((transfer, index) => (
                    <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <p className="font-medium">
                            {transfer.from_room.number} → {transfer.to_room.number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transfer.reason} • {format(new Date(transfer.transfer_date), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{transfer.transfer_staff.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={isLoading || !formData.toRoomId || !formData.reason || !formData.transferStaffId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing Transfer...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Room
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
