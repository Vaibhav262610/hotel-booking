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

interface BlockedRoomRecord {
  id: string
  s_no: number
  room_number: string
  room_type: string
  blocked_date: string
  room_status: string
  blocked_from: string
  blocked_to: string
  reason: string
  staff_blocked_by: string
  unblocked_date: string | null
  unblocked_by: string | null
  unblock_reason: string | null
  notes: string | null
}

interface BlockedRoomData {
  success: boolean
  data: BlockedRoomRecord[]
  summary: {
    total_blocked: number
    currently_blocked: number
    unblocked: number
    blocked_by_staff: Record<string, number>
    blocked_by_reason: Record<string, number>
  }
}

interface BlockedRoomTableProps {
  data: BlockedRoomData
  isLoading?: boolean
}

export function BlockedRoomTable({ data, isLoading }: BlockedRoomTableProps) {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blocked Rooms Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading blocked rooms...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blocked Rooms Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">No blocked rooms found for the selected period.</div>
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
            <CardTitle className="text-sm font-medium">Total Rooms Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_blocked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked Rooms Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[100px]">Room Number</TableHead>
                  <TableHead className="w-[120px]">Room Type</TableHead>
                  <TableHead className="w-[120px]">Blocked Date</TableHead>
                  <TableHead className="w-[100px]">Room Status</TableHead>
                  <TableHead className="w-[120px]">Blocked From</TableHead>
                  <TableHead className="w-[120px]">Blocked To</TableHead>
                  <TableHead className="w-[200px]">Reason of Block</TableHead>
                  <TableHead className="w-[120px]">Staff Blocked By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.s_no}</TableCell>
                    <TableCell className="font-mono text-sm">{record.room_number}</TableCell>
                    <TableCell>{record.room_type}</TableCell>
                    <TableCell>{formatDateTime(record.blocked_date)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {record.room_status}
                        {record.unblocked_date && (
                          <div className="text-xs text-muted-foreground">
                            Unblocked: {formatDateTime(record.unblocked_date)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(record.blocked_from)}</TableCell>
                    <TableCell>{formatDate(record.blocked_to)}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={record.reason}>
                        {record.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{record.staff_blocked_by}</div>
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
