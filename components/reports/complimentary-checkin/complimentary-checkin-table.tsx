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

interface ComplimentaryCheckinRecord {
  id: string
  booking_number: string
  guest_name: string
  guest_phone: string
  room_number: string
  room_type: string
  checkin_time: string
  checkout_time: string
  planned_nights: number
  complimentary_reason: string
  approved_by: string
  approved_date: string
  status: string
  staff_name: string
  total_value: number
}

interface ComplimentaryCheckinTableProps {
  data: ComplimentaryCheckinRecord[]
}

const ITEMS_PER_PAGE = 15

export function ComplimentaryCheckinTable({ data }: ComplimentaryCheckinTableProps) {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No complimentary check-in records found for the selected date range.
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
              <TableHead>Guest Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Room Type</TableHead>
              <TableHead>Check-in Time</TableHead>
              <TableHead>Check-out Time</TableHead>
              <TableHead>Planned Nights</TableHead>
              <TableHead>Complimentary Reason</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead>Approved Date</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {record.booking_number}
                </TableCell>
                <TableCell>{record.guest_name}</TableCell>
                <TableCell>{record.guest_phone}</TableCell>
                <TableCell>{record.room_number}</TableCell>
                <TableCell>{record.room_type}</TableCell>
                <TableCell>{formatDateTime(record.checkin_time)}</TableCell>
                <TableCell>{formatDateTime(record.checkout_time)}</TableCell>
                <TableCell>{record.planned_nights}</TableCell>
                <TableCell>
                  <span className="max-w-[200px] truncate block" title={record.complimentary_reason}>
                    {record.complimentary_reason}
                  </span>
                </TableCell>
                <TableCell>{record.approved_by}</TableCell>
                <TableCell>{formatDateTime(record.approved_date)}</TableCell>
                <TableCell className="font-medium text-green-600">
                  {formatCurrency(record.total_value)}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'approved' 
                      ? 'bg-green-100 text-green-800'
                      : record.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : record.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status}
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
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                if (pageNum > totalPages) return null
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
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
