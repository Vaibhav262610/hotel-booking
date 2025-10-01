"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Trash2, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";

interface RoomData {
  id: string;
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomStatus: 'reserved' | 'checked_in' | 'checked_out' | 'cancelled';
  roomRate: number;
  roomTotal: number;
  roomNumber: string;
  roomType: string;
}

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  rooms: any[];
  staff: any[];
  handleRoomChange: (roomId: string) => void;
  onSave: (roomData: RoomData[]) => void;
  selectedBooking: any;
}

export function EditBookingDialog({ open, onOpenChange, formData, setFormData, rooms, staff, handleRoomChange, onSave, selectedBooking }: EditBookingDialogProps) {
  const [editingRoom, setEditingRoom] = useState<RoomData | null>(null);
  const [roomData, setRoomData] = useState<RoomData[]>([]);

  // Initialize room data when dialog opens
  useEffect(() => {
    if (selectedBooking && selectedBooking.booking_rooms) {
      const rooms = selectedBooking.booking_rooms.map((br: any) => ({
        id: br.id,
        roomId: br.room_id,
        checkInDate: new Date(br.check_in_date),
        checkOutDate: new Date(br.check_out_date),
        roomStatus: br.room_status,
        roomRate: br.room_rate || 0,
        roomTotal: br.room_total || 0,
        roomNumber: br.room?.number || '',
        roomType: br.room?.room_type?.name || ''
      }));
      setRoomData(rooms);
    }
  }, [selectedBooking]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      reserved: { color: "bg-yellow-100 text-yellow-800", label: "Reserved" },
      checked_in: { color: "bg-green-100 text-green-800", label: "Checked In" },
      checked_out: { color: "bg-gray-100 text-gray-800", label: "Checked Out" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.reserved;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleRoomEdit = (room: RoomData) => {
    setEditingRoom(room);
  };

  const handleRoomUpdate = (updatedRoom: RoomData) => {
    setRoomData(prev => prev.map(room => 
      room.id === updatedRoom.id ? updatedRoom : room
    ));
    setEditingRoom(null);
  };

  const handleRoomDelete = (roomId: string) => {
    setRoomData(prev => prev.filter(room => room.id !== roomId));
  };

  const handleAddRoom = () => {
    const newRoom: RoomData = {
      id: `temp-${Date.now()}`,
      roomId: '',
      checkInDate: formData.checkInDate || new Date(),
      checkOutDate: formData.checkOutDate || new Date(),
      roomStatus: 'reserved',
      roomRate: 0,
      roomTotal: 0,
      roomNumber: '',
      roomType: ''
    };
    setEditingRoom(newRoom);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-t-md">
          <DialogTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Booking - {selectedBooking?.booking_number}
          </DialogTitle>
          <DialogDescription className="text-blue-700">
            Update booking information and manage room reservations
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 px-6">
          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Guest Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guest Name</Label>
                <Input 
                  value={formData.guestName} 
                  onChange={(e) => setFormData((prev) => ({ ...prev, guestName: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.guestPhone} 
                  onChange={(e) => setFormData((prev) => ({ ...prev, guestPhone: e.target.value }))} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={formData.guestEmail} 
                onChange={(e) => setFormData((prev) => ({ ...prev, guestEmail: e.target.value }))} 
              />
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.checkInDate ? format(formData.checkInDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.checkInDate}
                      onSelect={(date) => setFormData((prev) => ({ ...prev, checkInDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.checkOutDate ? format(formData.checkOutDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.checkOutDate}
                      onSelect={(date) => setFormData((prev) => ({ ...prev, checkOutDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Number of Guests</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.numberOfGuests || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, numberOfGuests: Number(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Child Guests</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.childGuests || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, childGuests: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Extra Guests</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.extraGuests || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, extraGuests: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          {/* Staff Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Staff Assignment</h3>
            <div className="space-y-2">
              <Label>Assigned Staff</Label>
              <Select value={formData.staffId} onValueChange={(value) => setFormData((prev) => ({ ...prev, staffId: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={String(member.id)} value={String(member.id)}>
                      {member.name} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Room Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Room Reservations</h3>
              <Button onClick={handleAddRoom} size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>
            
            <div className="space-y-3">
              {roomData.map((room) => (
                <div key={room.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Room {room.roomNumber}</span>
                      <span className="text-sm text-gray-600">({room.roomType})</span>
                      {getStatusBadge(room.roomStatus)}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleRoomEdit(room)} 
                        size="sm" 
                        variant="outline"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        onClick={() => handleRoomDelete(room.id)} 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Check-in:</span>
                      <span className="ml-2 font-medium">{format(room.checkInDate, "MMM dd, yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Check-out:</span>
                      <span className="ml-2 font-medium">{format(room.checkOutDate, "MMM dd, yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rate:</span>
                      <span className="ml-2 font-medium">₹{room.roomRate}/night</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-medium">₹{room.roomTotal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  value={formData.totalAmount ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      totalAmount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Advance Amount</Label>
                <Input
                  type="number"
                  value={formData.advanceAmount ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      advanceAmount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Arrival Type</Label>
              <Select value={formData.arrivalType} onValueChange={(value) => setFormData((prev) => ({ ...prev, arrivalType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="OTA">OTA</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meal Plan & Purpose */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Meal Plan & Purpose</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meal Plan</Label>
                <Select value={formData.mealPlan} onValueChange={(value) => setFormData((prev) => ({ ...prev, mealPlan: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EP">European Plan (EP)</SelectItem>
                    <SelectItem value="CP">Continental Plan (CP)</SelectItem>
                    <SelectItem value="MAP">Modified American Plan (MAP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={formData.planName || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, planName: e.target.value }))}
                  placeholder="e.g., STD, DELUXE"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose of Visit</Label>
              <Input
                value={formData.purpose || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                placeholder="e.g., Business, Leisure, Wedding"
              />
            </div>
            <div className="space-y-2">
              <Label>OTA Company (if applicable)</Label>
              <Input
                value={formData.otaCompany || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, otaCompany: e.target.value }))}
                placeholder="e.g., Booking.com, Expedia"
              />
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label htmlFor="edit-special-requests">Special Requests</Label>
            <Textarea 
              id="edit-special-requests" 
              value={formData.specialRequests} 
              onChange={(e) => setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))} 
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(roomData)} className="bg-blue-600 hover:bg-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Room Edit Dialog */}
    {editingRoom && (
      <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Room Details</DialogTitle>
            <DialogDescription>
              Update room information, dates, and status
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select 
                value={editingRoom.roomId} 
                onValueChange={(value) => {
                  const selectedRoom = rooms.find(r => r.id === value);
                  setEditingRoom(prev => prev ? {
                    ...prev,
                    roomId: value,
                    roomNumber: selectedRoom?.number || '',
                    roomType: selectedRoom?.room_type?.name || '',
                    roomRate: selectedRoom?.price || 0
                  } : null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.number} - {room.room_type?.name} (₹{room.price}/night)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingRoom.checkInDate ? format(editingRoom.checkInDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingRoom.checkInDate}
                      onSelect={(date) => setEditingRoom(prev => prev ? { ...prev, checkInDate: date || prev.checkInDate } : null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingRoom.checkOutDate ? format(editingRoom.checkOutDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingRoom.checkOutDate}
                      onSelect={(date) => setEditingRoom(prev => prev ? { ...prev, checkOutDate: date || prev.checkOutDate } : null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Rate</Label>
                <Input
                  type="number"
                  value={editingRoom.roomRate}
                  onChange={(e) => setEditingRoom(prev => prev ? { ...prev, roomRate: Number(e.target.value) || 0 } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Room Status</Label>
                <Select 
                  value={editingRoom.roomStatus} 
                  onValueChange={(value: any) => setEditingRoom(prev => prev ? { ...prev, roomStatus: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room Total</Label>
              <Input
                type="number"
                value={editingRoom.roomTotal}
                onChange={(e) => setEditingRoom(prev => prev ? { ...prev, roomTotal: Number(e.target.value) || 0 } : null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
            <Button onClick={() => {
              if (editingRoom) {
                handleRoomUpdate(editingRoom);
              }
            }}>Save Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}