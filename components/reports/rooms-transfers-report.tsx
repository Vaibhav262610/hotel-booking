"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Loader2, Download, BarChart3, Users, Clock } from "lucide-react"
import { DateRangePicker } from "./shared/date-range-picker"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { RoomTransferService } from "@/lib/room-transfer-service"

interface TransferRow {
  s_no: number
  booking_number: string
  checkin_date: string | null
  guest_name: string
  from_room: string
  to_room: string
  transfer_date: string
  reason: string
  checked_in_by: string
  transfer_by: string
  status: string
}

export function RoomsTransfersReport() {
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<TransferRow[]>([])
  const [statistics, setStatistics] = useState<any>(null)

  const fetchData = async () => {
    if (!fromDate || !toDate) return
    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      // Fetch transfer data
      const res = await fetch(`/api/reports/rooms-transfers?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      if (!res.ok) throw new Error('Failed to fetch room transfers')
      const json = await res.json()
      setRows(json.data || [])

      // Fetch statistics
      const stats = await RoomTransferService.getTransferStatistics(fromDate, toDate)
      setStatistics(stats)

      toast({ 
        title: "Rooms Transfers Report generated", 
        description: `Found ${json.total ?? (json.data?.length || 0)} transfers.` 
      })
    } catch (e) {
      console.error(e)
      toast({ 
        title: "Failed to generate report", 
        description: e instanceof Error ? e.message : 'Unknown error', 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (rows.length === 0) {
      toast({ title: "No data to export", variant: "destructive" })
      return
    }

    const headers = [
      'S.No', 'Check-in Date', 'GRC No', 'Guest Name', 'From Room', 
      'To Room', 'Transfer Date', 'Reason', 'Check-in By', 'Transfer By', 'Status'
    ]
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        row.s_no,
        row.checkin_date || '',
        row.booking_number,
        row.guest_name,
        row.from_room,
        row.to_room,
        row.transfer_date,
        row.reason,
        row.checked_in_by,
        row.transfer_by,
        row.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `room-transfers-${format(fromDate!, 'yyyy-MM-dd')}-to-${format(toDate!, 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Rooms Transfers Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        />
        <div className="flex gap-3">
          <Button
            onClick={fetchData}
            disabled={loading || !fromDate || !toDate}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
          {rows.length > 0 && (
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
        {rows.length > 0 && (
          <div className="space-y-4">
            {/* Statistics Cards */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Transfers</p>
                        <p className="text-2xl font-bold">{statistics.totalTransfers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Guest Requests</p>
                        <p className="text-2xl font-bold">{statistics.transfersByReason['Guest request'] || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Maintenance</p>
                        <p className="text-2xl font-bold">{statistics.transfersByReason['Room maintenance required'] || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Other Reasons</p>
                        <p className="text-2xl font-bold">
                          {statistics.totalTransfers - (statistics.transfersByReason['Guest request'] || 0) - (statistics.transfersByReason['Room maintenance required'] || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Transfer Details</h3>
              <Badge variant="outline" className="text-sm">
                {rows.length} transfers found
              </Badge>
            </div>
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">S.No</th>
                    <th className="px-3 py-2 text-left">Check-in Date</th>
                    <th className="px-3 py-2 text-left">GRC No</th>
                    <th className="px-3 py-2 text-left">Guest Name</th>
                    <th className="px-3 py-2 text-left">From Room</th>
                    <th className="px-3 py-2 text-left">To Room</th>
                    <th className="px-3 py-2 text-left">Transfer Date</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">Check-in By</th>
                    <th className="px-3 py-2 text-left">Transfer By</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.s_no}-${r.booking_number}-${r.transfer_date}`} className="border-t">
                      <td className="px-3 py-2">{r.s_no}</td>
                      <td className="px-3 py-2">{r.checkin_date ? new Date(r.checkin_date).toLocaleString('en-IN') : ''}</td>
                      <td className="px-3 py-2">{r.booking_number}</td>
                      <td className="px-3 py-2">{r.guest_name}</td>
                      <td className="px-3 py-2">{r.from_room}</td>
                      <td className="px-3 py-2">{r.to_room}</td>
                      <td className="px-3 py-2">{new Date(r.transfer_date).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2">{r.reason}</td>
                      <td className="px-3 py-2">{r.checked_in_by}</td>
                      <td className="px-3 py-2">{r.transfer_by}</td>
                      <td className="px-3 py-2">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


