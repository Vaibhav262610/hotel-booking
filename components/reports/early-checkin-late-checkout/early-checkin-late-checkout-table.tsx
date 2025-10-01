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

interface EarlyCheckinLateCheckoutRecord {
  id: string
  booking_number: string
  guest_name: string
  guest_phone: string
  room_number: string
  room_type: string
  checkin_time: string
  checkout_time: string
  planned_checkin: string
  planned_checkout: string
  checkin_difference_hours: number
  checkout_difference_hours: number
  type: "early_checkin" | "late_checkout"
  status: string
  staff_name: string
}

interface EarlyCheckinLateCheckoutTableProps {
  data: EarlyCheckinLateCheckoutRecord[]
}

const ITEMS_PER_PAGE = 15

export function EarlyCheckinLateCheckoutTable({ data }: EarlyCheckinLateCheckoutTableProps) {
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

  const formatDifference = (hours: number) => {
    if (hours === 0) return 'On Time'
    const absHours = Math.abs(hours)
    const days = Math.floor(absHours / 24)
    const remainingHours = absHours % 24
    
    let result = ''
    if (days > 0) result += `${days}d `
    if (remainingHours > 0) result += `${remainingHours}h`
    
    return hours > 0 ? `+${result.trim()}` : `-${result.trim()}`
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No early check-in or late checkout records found for the selected date range.
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
              <TableHead>Type</TableHead>
              <TableHead>Actual Time</TableHead>
              <TableHead>Planned Time</TableHead>
              <TableHead>Difference</TableHead>
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
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.type === 'early_checkin' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {record.type === 'early_checkin' ? 'Early Check-in' : 'Late Checkout'}
                  </span>
                </TableCell>
                <TableCell>
                  {record.type === 'early_checkin' 
                    ? formatDateTime(record.checkin_time)
                    : formatDateTime(record.checkout_time)
                  }
                </TableCell>
                <TableCell>
                  {record.type === 'early_checkin' 
                    ? formatDateTime(record.planned_checkin)
                    : formatDateTime(record.planned_checkout)
                  }
                </TableCell>
                <TableCell>
                  <span className={`font-medium ${
                    record.type === 'early_checkin' 
                      ? (record.checkin_difference_hours < 0 ? 'text-green-600' : 'text-red-600')
                      : (record.checkout_difference_hours > 0 ? 'text-red-600' : 'text-green-600')
                  }`}>
                    {record.type === 'early_checkin' 
                      ? formatDifference(record.checkin_difference_hours)
                      : formatDifference(record.checkout_difference_hours)
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : record.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
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
