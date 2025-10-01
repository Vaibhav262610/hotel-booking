"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

interface Address {
  street_address: string
  city: string
  postal_code: string
  state: string
  country: string
}

interface RoomDetail {
  room_type: string
  room_number: string
  plan_name: string
  actual_checkin_time: string | null
  actual_checkout_time: string | null
  grace_time: string | null
  guest_address: Address | string | null
  current_staff: string
  last_updated_date: string
}

interface ArrivalLogRecord {
  booking_number: string
  guest_name: string
  checkin_date: string
  arrival_type: string
  ota_company: string
  staff_name: string
  last_updated_time: string
  rooms: RoomDetail[]
}

interface ArrivalLogTableProps {
  data: ArrivalLogRecord[]
}

export function ArrivalLogTable({ data }: ArrivalLogTableProps) {
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd-MM-yyyy HH:mm:ss')
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    try {
      // Handle interval format (e.g., "01:00:00")
      if (timeString.includes(':')) {
        return timeString
      }
      return format(new Date(timeString), 'HH:mm:ss')
    } catch {
      return timeString
    }
  }

  const formatAddress = (address: any) => {
    if (!address) return '-'
    
    // If address is already an object
    if (typeof address === 'object' && address !== null) {
      const parts = []
      if (address.street_address) parts.push(address.street_address)
      if (address.city) parts.push(address.city)
      if (address.postal_code) parts.push(address.postal_code)
      if (address.state) parts.push(address.state)
      if (address.country) parts.push(address.country)
      return parts.join(', ')
    }
    
    // If address is a string, try to parse as JSON
    if (typeof address === 'string') {
      try {
        const parsed = JSON.parse(address)
        if (typeof parsed === 'object' && parsed !== null) {
          const parts = []
          if (parsed.street_address) parts.push(parsed.street_address)
          if (parsed.city) parts.push(parsed.city)
          if (parsed.postal_code) parts.push(parsed.postal_code)
          if (parsed.state) parts.push(parsed.state)
          if (parsed.country) parts.push(parsed.country)
          return parts.join(', ')
        }
        return address
      } catch {
        // If not JSON, return as is
        return address
      }
    }
    
    return '-'
  }

  return (
    <div className="space-y-4">
      {data.map((booking, bookingIndex) => (
        <div key={booking.booking_number} className="border rounded-lg overflow-hidden shadow-sm">
          {/* Booking Header - Row 1 */}
          <div className="bg-black text-white px-4 py-3 border-b-2 border-gray-800">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium">
              <div className="text-center">
                <span className="text-gray-300">Booking Number:</span>
                <span className="ml-2 font-semibold text-white">{booking.booking_number}</span>
              </div>
              <div className="text-center">
                <span className="text-gray-300">Guest Name:</span>
                <span className="ml-2 font-semibold text-white">{booking.guest_name}</span>
              </div>
              <div className="text-center">
                <span className="text-gray-300">Check-in Date:</span>
                <span className="ml-2 font-semibold text-white">{formatDateTime(booking.checkin_date)}</span>
              </div>
            </div>
          </div>

          {/* Booking Details - Row 2 */}
          <div className="bg-white px-4 py-2 border-b">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-32">Arrival Mode</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-24">OTA</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-24">Company</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-32">Staff</TableHead>
                  <TableHead className="text-xs font-medium text-center bg-gray-100 w-40">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-10">
                  <TableCell className="text-xs text-center border-r">{booking.arrival_type || '-'}</TableCell>
                  <TableCell className="text-xs text-center border-r">{booking.ota_company || '-'}</TableCell>
                  <TableCell className="text-xs text-center border-r">-</TableCell>
                  <TableCell className="text-xs text-center border-r font-medium">{booking.staff_name || '-'}</TableCell>
                  <TableCell className="text-xs text-center">{formatDateTime(booking.last_updated_time)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Room Details - Row 3+ */}
          <div className="bg-white px-4 py-2">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-32">Room Type</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-20">Room No</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-24">Plan Name</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-40">Check-in Date</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-40">Checkout Date</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-24">Grace Time</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-48">Billing Address</TableHead>
                  <TableHead className="text-xs font-medium text-center border-r bg-gray-100 w-32">Current Staff</TableHead>
                  <TableHead className="text-xs font-medium text-center bg-gray-100 w-40">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.rooms.map((room, roomIndex) => (
                  <TableRow key={`${booking.booking_number}-${roomIndex}`} className="h-10">
                    <TableCell className="text-xs text-center border-r">{room.room_type || '-'}</TableCell>
                    <TableCell className="text-xs text-center border-r font-medium">{room.room_number || '-'}</TableCell>
                    <TableCell className="text-xs text-center border-r">{room.plan_name || '-'}</TableCell>
                    <TableCell className="text-xs text-center border-r">{formatDateTime(room.actual_checkin_time)}</TableCell>
                    <TableCell className="text-xs text-center border-r font-medium">
                      {formatDateTime(room.actual_checkout_time)}
                    </TableCell>
                    <TableCell className="text-xs text-center border-r font-medium">
                      {formatTime(room.grace_time)}
                    </TableCell>
                    <TableCell className="text-xs text-center border-r truncate" title={formatAddress(room.guest_address)}>
                      {formatAddress(room.guest_address)}
                    </TableCell>
                    <TableCell className="text-xs text-center border-r font-medium">{room.current_staff || '-'}</TableCell>
                    <TableCell className="text-xs text-center">{formatDateTime(room.last_updated_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
