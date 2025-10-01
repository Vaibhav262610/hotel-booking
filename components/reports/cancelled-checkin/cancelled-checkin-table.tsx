"use client"

import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CancelledCheckinRecord {
  id: string
  s_no: number
  booking_id: string
  number_of_rooms: number
  expected_checkin_date: string
  expected_checkout_date: string
  number_of_nights: number
  cancellation_reason: string
  cancel_date: string
  staff_name: string
  staff_id: string | null
  refund_amount: number
  refund_processed: boolean
  refund_processed_date: string | null
  cancellation_notes: string | null
}

interface CancelledCheckinData {
  success: boolean
  data: CancelledCheckinRecord[]
  summary: {
    total_cancelled: number
    total_rooms_cancelled: number
    total_nights_cancelled: number
    total_refund_amount: number
    refunds_processed: number
    refunds_pending: number
    cancellation_reasons: Record<string, number>
    cancelled_by_staff: Record<string, number>
  }
}

interface CancelledCheckinTableProps {
  data: CancelledCheckinData
  isLoading?: boolean
}

export function CancelledCheckinTable({ data, isLoading }: CancelledCheckinTableProps) {

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cancelled Check-in Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading cancelled bookings...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cancelled Check-in Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">No cancelled bookings found for the selected period.</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cancelled Bookings Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[120px]">Booking ID</TableHead>
                  <TableHead className="w-[80px]">Rooms</TableHead>
                  <TableHead className="w-[120px]">Expected Check-in</TableHead>
                  <TableHead className="w-[120px]">Expected Check-out</TableHead>
                  <TableHead className="w-[80px]">Nights</TableHead>
                  <TableHead className="w-[180px]">Cancellation Reason</TableHead>
                  <TableHead className="w-[90px]">Refund Amount</TableHead>
                  <TableHead className="w-[100px]">Refund Status</TableHead>
                  <TableHead className="w-[120px]">Cancel Date</TableHead>
                  <TableHead className="w-[120px]">Staff Cancellation By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((record) => (
                  <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.s_no}</TableCell>
                      <TableCell className="font-mono text-sm">{record.booking_id}</TableCell>
                      <TableCell>
                        {record.number_of_rooms} rooms
                      </TableCell>
                      <TableCell>{formatDate(record.expected_checkin_date)}</TableCell>
                      <TableCell>{formatDate(record.expected_checkout_date)}</TableCell>
                      <TableCell>
                        {record.number_of_nights} nights
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={record.cancellation_reason}>
                          {record.cancellation_reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(record.refund_amount)}</div>
                        {record.refund_processed_date && (
                          <div className="text-xs text-muted-foreground">
                            Processed: {formatDate(record.refund_processed_date)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.refund_processed ? 'Processed' : 'Pending'}
                      </TableCell>
                      <TableCell>{formatDateTime(record.cancel_date)}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{record.staff_name}</div>
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
