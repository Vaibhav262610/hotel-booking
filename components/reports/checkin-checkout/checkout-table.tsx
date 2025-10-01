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

interface CheckoutRecord {
  id: string
  booking_number: string
  checkout_time: string
  actual_nights?: number | null
  number_of_guests?: number | null
  child_guests?: number | null
  extra_guests?: number | null
  bill_number?: string | null
  full_payment: number
  payment_method: string
  arrival_type?: string
  company_ota_agent?: string
  price_adjustment: number
  checkout_notes: string
  guest_name: string
  guest_phone: string
  room_number: string
  room_type: string
  hotel_name: string
  staff_name: string
  receipt_cash?: number
  receipt_card?: number
  receipt_bank?: number
  receipt_upi?: number
  receipt_total?: number
  outstanding_amount?: number
}

interface CheckoutTableProps {
  data: CheckoutRecord[]
}

const ITEMS_PER_PAGE = 15

export function CheckoutTable({ data }: CheckoutTableProps) {
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
        No check-out records found for the selected date range.
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
              <TableHead>Check-out Time</TableHead>
              <TableHead>Actual Nights</TableHead>
              <TableHead>Guest Name</TableHead>
              <TableHead>PAX</TableHead>
              <TableHead>Child PAX</TableHead>
              <TableHead>Extra PAX</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Room Type</TableHead>
              <TableHead>Arrival Type</TableHead>
              <TableHead>Company / OTA / Agent</TableHead>
              <TableHead>Receipt Cash</TableHead>
              <TableHead>Receipt Card</TableHead>
              <TableHead>Receipt Bank</TableHead>
              <TableHead>Receipt UPI</TableHead>
              <TableHead>Receipt Total</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Price Adjustment</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Bill #</TableHead>
              <TableHead>Staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {record.booking_number}
                </TableCell>
                <TableCell>
                  {formatDateTime(record.checkout_time)}
                </TableCell>
                <TableCell>
                  {record.actual_nights ?? '—'}
                </TableCell>
                <TableCell>{record.guest_name}</TableCell>
                <TableCell>{record.number_of_guests ?? '—'}</TableCell>
                <TableCell>{record.child_guests ?? '—'}</TableCell>
                <TableCell>{record.extra_guests ?? '—'}</TableCell>
                <TableCell>{record.guest_phone}</TableCell>
                <TableCell>{record.room_number}</TableCell>
                <TableCell>{record.room_type}</TableCell>
                <TableCell>{record.arrival_type || 'N/A'}</TableCell>
                <TableCell>{record.company_ota_agent || 'N/A'}</TableCell>
                <TableCell>{formatCurrency(record.receipt_cash || 0)}</TableCell>
                <TableCell>{formatCurrency(record.receipt_card || 0)}</TableCell>
                <TableCell>{formatCurrency(record.receipt_bank || 0)}</TableCell>
                <TableCell>{formatCurrency(record.receipt_upi || 0)}</TableCell>
                <TableCell>{formatCurrency(record.receipt_total || record.full_payment || 0)}</TableCell>
                <TableCell>{formatCurrency(record.outstanding_amount || 0)}</TableCell>
                <TableCell>
                  <span className={record.price_adjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(record.price_adjustment)}
                  </span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {record.checkout_notes || '-'}
                </TableCell>
                <TableCell>{record.bill_number || '—'}</TableCell>
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
