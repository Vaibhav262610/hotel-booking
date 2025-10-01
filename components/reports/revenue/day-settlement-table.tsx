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

interface DaySettlementRecord {
  id: string
  date: string
  total_revenue: number
  room_revenue: number
  service_revenue: number
  advance_collections: number
  outstanding_amount: number
  cash_collections: number
  card_collections: number
  upi_collections: number
  bank_transfer_collections: number
  total_collections: number
  occupancy_percentage: number
  average_room_rate: number
  total_rooms: number
  occupied_rooms: number
}

interface DaySettlementTableProps {
  data: DaySettlementRecord[]
}

const ITEMS_PER_PAGE = 15

export function DaySettlementTable({ data }: DaySettlementTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentData = data.slice(startIndex, endIndex)

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return 'N/A'
    try {
      return format(new Date(dateTime), 'dd-MM-yyyy')
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No settlement records found for the selected date range.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Total Revenue</TableHead>
              <TableHead>Room Revenue</TableHead>
              <TableHead>Service Revenue</TableHead>
              <TableHead>Advance Collections</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Cash</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>UPI</TableHead>
              <TableHead>Bank Transfer</TableHead>
              <TableHead>Total Collections</TableHead>
              <TableHead>Occupancy %</TableHead>
              <TableHead>Avg Room Rate</TableHead>
              <TableHead>Rooms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {formatDateTime(record.date)}
                </TableCell>
                <TableCell className="font-medium text-green-600">
                  {formatCurrency(record.total_revenue)}
                </TableCell>
                <TableCell>{formatCurrency(record.room_revenue)}</TableCell>
                <TableCell>{formatCurrency(record.service_revenue)}</TableCell>
                <TableCell className="text-blue-600">
                  {formatCurrency(record.advance_collections)}
                </TableCell>
                <TableCell className="text-red-600">
                  {formatCurrency(record.outstanding_amount)}
                </TableCell>
                <TableCell>{formatCurrency(record.cash_collections)}</TableCell>
                <TableCell>{formatCurrency(record.card_collections)}</TableCell>
                <TableCell>{formatCurrency(record.upi_collections)}</TableCell>
                <TableCell>{formatCurrency(record.bank_transfer_collections)}</TableCell>
                <TableCell className="font-medium text-green-600">
                  {formatCurrency(record.total_collections)}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.occupancy_percentage >= 80 
                      ? 'bg-green-100 text-green-800'
                      : record.occupancy_percentage >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formatPercentage(record.occupancy_percentage)}
                  </span>
                </TableCell>
                <TableCell>{formatCurrency(record.average_room_rate)}</TableCell>
                <TableCell>
                  {record.occupied_rooms}/{record.total_rooms}
                </TableCell>
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
