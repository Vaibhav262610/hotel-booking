"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ExpectedCheckoutRecord {
  id: string
  booking_id: string
  booking_number: string
  checkin_date: string
  expected_checkout: string
  planned_nights?: number | null
  number_of_guests?: number | null
  child_guests?: number | null
  extra_guests?: number | null
  status: string
  guest_name: string
  guest_phone: string
  room_number: string
  room_type: string
  room_status: string
  hotel_name: string
  staff_name: string
}

interface ExpectedCheckoutTableProps {
  data: ExpectedCheckoutRecord[]
}

const ITEMS_PER_PAGE = 15

export function ExpectedCheckoutTable({ data }: ExpectedCheckoutTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentData = data.slice(startIndex, endIndex)

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return 'N/A'
    try {
      return format(new Date(dateTime), 'dd-MM-yyyy HH:mm')
    } catch {
      return 'N/A'
    }
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No expected checkout records found for the selected date range.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking #</TableHead>
              <TableHead>Room Number</TableHead>
              <TableHead>Room Type</TableHead>
              <TableHead>Room Status</TableHead>
              <TableHead>Guest Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>PAX</TableHead>
              <TableHead>Child PAX</TableHead>
              <TableHead>Extra PAX</TableHead>
              <TableHead>Check-in Date</TableHead>
              <TableHead>Expected Checkout</TableHead>
              <TableHead>Planned Nights</TableHead>
              <TableHead>Booking Status</TableHead>
              <TableHead>Staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-mono text-sm font-medium">
                  {record.booking_number}
                </TableCell>
                <TableCell className="font-medium">
                  {record.room_number}
                </TableCell>
                <TableCell>{record.room_type}</TableCell>
                <TableCell>
                  <span className="capitalize">
                    {record.room_status?.replace('_', ' ') || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {record.guest_name}
                </TableCell>
                <TableCell>{record.guest_phone}</TableCell>
                <TableCell>{record.number_of_guests ?? '—'}</TableCell>
                <TableCell>{record.child_guests ?? '—'}</TableCell>
                <TableCell>{record.extra_guests ?? '—'}</TableCell>
                <TableCell>
                  {formatDateTime(record.checkin_date)}
                </TableCell>
                <TableCell>
                  {formatDateTime(record.expected_checkout)}
                </TableCell>
                <TableCell>
                  {record.planned_nights ?? '—'}
                </TableCell>
                <TableCell>
                  <span className="capitalize">
                    {record.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>{record.staff_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} records
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
