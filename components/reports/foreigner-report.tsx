"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "./shared/date-range-picker"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"

interface Row {
  s_no: number
  booking_id: string
  room_number: string
  room_type: string
  status: string
  guest_name: string
  nationality: string
  contact_number: string
  passport_number: string
  arrival_from: string
  arrival_mode: string
  actual_arrival_date: string | null
  actual_check_out_date: string | null
}

export function ForeignerReport({ loading: externalLoading = false }: { loading?: boolean }) {
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [generated, setGenerated] = useState(false)

  const fetchData = async () => {
    if (!fromDate || !toDate) return
    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      const res = await fetch(`/api/reports/foreigner-report?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      if (!res.ok) throw new Error('Failed to fetch foreigner report')
      const json = await res.json()
      setRows(json.data || [])
      setGenerated(true)
      toast({ title: "Foreigner Report generated", description: `Found ${json.total ?? (json.data?.length || 0)} entries.` })
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to generate report", description: e instanceof Error ? e.message : 'Unknown error', variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Foreigner Report</CardTitle>
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
            disabled={loading || externalLoading || !fromDate || !toDate}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
        </div>

        {generated && rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Total Foreign Guests: {rows.length}</h3>
            </div>
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">S.No</th>
                    <th className="px-3 py-2 text-left">Booking ID</th>
                    <th className="px-3 py-2 text-left">Room #</th>
                    <th className="px-3 py-2 text-left">Room Type</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Guest Name</th>
                    <th className="px-3 py-2 text-left">Nationality</th>
                    <th className="px-3 py-2 text-left">Contact Number</th>
                    <th className="px-3 py-2 text-left">Passport Number</th>
                    <th className="px-3 py-2 text-left">Arrival From</th>
                    <th className="px-3 py-2 text-left">Arrival Mode</th>
                    <th className="px-3 py-2 text-left">Actual Arrival</th>
                    <th className="px-3 py-2 text-left">Actual Checkout</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.s_no}-${r.booking_id}-${r.room_number}-${r.actual_arrival_date || ''}`} className="border-t">
                      <td className="px-3 py-2">{r.s_no}</td>
                      <td className="px-3 py-2">{r.booking_id}</td>
                      <td className="px-3 py-2">{r.room_number}</td>
                      <td className="px-3 py-2">{r.room_type}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">{r.guest_name}</td>
                      <td className="px-3 py-2">{r.nationality}</td>
                      <td className="px-3 py-2">{r.contact_number}</td>
                      <td className="px-3 py-2">{r.passport_number}</td>
                      <td className="px-3 py-2">{r.arrival_from}</td>
                      <td className="px-3 py-2">{r.arrival_mode}</td>
                      <td className="px-3 py-2">{r.actual_arrival_date ? new Date(r.actual_arrival_date).toLocaleString('en-IN') : ''}</td>
                      <td className="px-3 py-2">{r.actual_check_out_date ? new Date(r.actual_check_out_date).toLocaleString('en-IN') : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {generated && rows.length === 0 && (
          <div className="overflow-auto border rounded-md">
            <div className="px-3 py-8 text-center text-muted-foreground">No foreigner entries found for selected dates.</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


