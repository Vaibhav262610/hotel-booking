"use client"

import { useState } from "react"
import { ReportType, REPORT_CONFIGS } from "./report-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CheckinTable, CheckoutTable } from "./checkin-checkout"
import { ExpectedCheckoutTable } from "./expected-checkout/expected-checkout-table"
import { OccupancyVacantReport } from "./occupancy-vacant-report"
import { PoliceReport } from "./police-report"
import { FoodPlanReport } from "./food-plan-report"
import { ArrivalTable } from "./arrival-report"
import { CancelledCheckinTable } from "./cancelled-checkin"
import { BlockedRoomTable } from "./blocked-rooms"
import { DateRangePicker } from "./shared/date-range-picker"
import { RoomsTransfersReport } from "./rooms-transfers-report"
import { ForeignerReport } from "./foreigner-report"
import { LogsReport } from "./logs-report"

interface CheckinRecord {
  id: string
  booking_number: string
  checkin_time: string
  planned_nights?: number | null
  number_of_guests?: number | null
  child_guests?: number | null
  extra_guests?: number | null
  bill_number?: string | null
  payment_method?: string | null
  arrival_type: string
  advance_amount: number
  status: string
  guest_name: string
  guest_phone: string
  room_number: string
  room_type: string
  hotel_name: string
  staff_name: string
}

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
  price_adjustment: number
  checkout_notes: string
  guest_name: string
  guest_phone: string
  room_number: string
  room_type: string
  hotel_name: string
  staff_name: string
}

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

interface ReportData {
  checkins: {
    total: number
    primary: CheckinRecord[]
    cancelled: CheckinRecord[]
    no_show: CheckinRecord[]
    pending: CheckinRecord[]
  }
  checkouts: {
    total: number
    primary: CheckoutRecord[]
    cancelled: CheckoutRecord[]
    no_show: CheckoutRecord[]
    pending: CheckoutRecord[]
  }
}

interface ExpectedCheckoutData {
  total: number
  data: ExpectedCheckoutRecord[]
}

interface ArrivalRecord {
  id: string
  booking_number: string
  guest_name: string
  arrival_type: string
  ota_company: string
  arrival_date: string
  departure_time: string | null
  planned_nights: number
  pax: number
  child_pax: number
  total_rooms: number
  meal_plan: string
  deluxe_count: number
  deluxe_triple_count: number
  deluxe_quad_count: number
  king_suite_count: number
  residential_suite_count: number
  advance_paid: number
  total_amount: number
  outstanding_amount: number
  booking_staff_name: string
  booked_on: string
}

interface ArrivalData {
  total: number
  data: ArrivalRecord[]
}

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
  rooms: Array<{
    room_number: string
    room_type: string
  }>
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

interface ReportModuleProps {
  type: ReportType
}

export function ReportModule({ type }: ReportModuleProps) {
  const config = REPORT_CONFIGS[type]
  
  // Debug logging to help identify missing report types
  if (!config) {
    console.warn(`Report type "${type}" not found in REPORT_CONFIGS`)
  }
  
  const safeConfig = config || { title: 'Unknown Report', description: 'Report not found', category: 'non-revenue' as const }
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [expectedCheckoutData, setExpectedCheckoutData] = useState<ExpectedCheckoutData | null>(null)
  const [arrivalData, setArrivalData] = useState<ArrivalData | null>(null)
  const [cancelledCheckinData, setCancelledCheckinData] = useState<CancelledCheckinData | null>(null)
  const [blockedRoomData, setBlockedRoomData] = useState<BlockedRoomData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchReportData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/checkin-checkout?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }
      
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error fetching report data:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const fetchExpectedCheckoutData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/expected-checkout?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch expected checkout data')
      }
      
      const data = await response.json()
      setExpectedCheckoutData(data)
    } catch (error) {
      console.error('Error fetching expected checkout data:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const fetchArrivalData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/arrival-report?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch arrival data')
      }
      
      const data = await response.json()
      setArrivalData(data)
    } catch (error) {
      console.error('Error fetching arrival data:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const fetchCancelledCheckinData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/cancelled-checkin?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch cancelled checkin data')
      }
      
      const data = await response.json()
      setCancelledCheckinData(data)
    } catch (error) {
      console.error('Error fetching cancelled checkin data:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const fetchBlockedRoomData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/blocked-rooms?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch blocked room data')
      }
      
      const data = await response.json()
      setBlockedRoomData(data)
    } catch (error) {
      console.error('Error fetching blocked room data:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const handleCSVDownload = async () => {
    if (!fromDate || !toDate) return

    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")

      const response = await fetch(`/api/reports/checkin-checkout/export-excel?fromDate=${fromDateStr}&toDate=${toDateStr}`)

      if (!response.ok) {
        throw new Error('Failed to download Excel file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `checkin-checkout-report-${fromDateStr.replace(/\//g, '-')}-to-${toDateStr.replace(/\//g, '-')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading Excel file:', error)
      // You might want to show a toast notification here
    }
  }


  // Special handling for checkin/checkout report
  if (type === "checkin-checkout") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Inputs */}
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={fetchReportData}
              disabled={loading || !fromDate || !toDate}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
            <Button
              onClick={handleCSVDownload}
              disabled={!reportData || loading}
              variant="outline"
              className="border-black text-black hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          </div>

          {/* Report Data Display */}
          {reportData && (
            <div className="space-y-8">
              {/* Check-in Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Total Check-ins: {reportData.checkins.total}
                  </h3>
                </div>
                <CheckinTable data={reportData.checkins.primary} />
                {reportData.checkins.pending.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Pending</h4>
                    <CheckinTable data={reportData.checkins.pending} />
                  </div>
                )}
                {reportData.checkins.no_show.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">No Show</h4>
                    <CheckinTable data={reportData.checkins.no_show} />
                  </div>
                )}
                {reportData.checkins.cancelled.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Cancelled</h4>
                    <CheckinTable data={reportData.checkins.cancelled} />
                  </div>
                )}
              </div>

              {/* Check-out Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Total Check-outs: {reportData.checkouts.total}
                  </h3>
                </div>
                <CheckoutTable data={reportData.checkouts.primary} />
                {reportData.checkouts.pending.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Pending</h4>
                    <CheckoutTable data={reportData.checkouts.pending} />
                  </div>
                )}
                {reportData.checkouts.no_show.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">No Show</h4>
                    <CheckoutTable data={reportData.checkouts.no_show} />
                  </div>
                )}
                {reportData.checkouts.cancelled.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Cancelled</h4>
                    <CheckoutTable data={reportData.checkouts.cancelled} />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Expected checkout report
  if (type === "expected-checkout") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Inputs */}
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={fetchExpectedCheckoutData}
              disabled={loading || !fromDate || !toDate}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>

          {/* Report Data Display */}
          {expectedCheckoutData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Total Expected Checkouts: {expectedCheckoutData.total}
                </h3>
              </div>
              <ExpectedCheckoutTable data={expectedCheckoutData.data} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Occupancy/Vacant report
  if (type === "occupancy-vacant") {
    return <OccupancyVacantReport loading={loading} />
  }

  // Police report
  if (type === "police-report") {
    return <PoliceReport loading={loading} />
  }

  // Food plan report
  if (type === "food-plan-report") {
    return <FoodPlanReport loading={loading} />
  }

  // Arrival report
  if (type === "arrival-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Inputs */}
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={fetchArrivalData}
              disabled={loading || !fromDate || !toDate}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>

          {/* Report Data Display */}
          {arrivalData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Total Arrivals: {arrivalData.total}
                </h3>
              </div>
              <ArrivalTable data={arrivalData.data} loading={loading} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Cancelled checkin report
  if (type === "cancelled-checkin-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Inputs */}
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={fetchCancelledCheckinData}
              disabled={loading || !fromDate || !toDate}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>

          {/* Report Data Display */}
          {cancelledCheckinData && (
            <CancelledCheckinTable data={cancelledCheckinData} isLoading={loading} />
          )}
        </CardContent>
      </Card>
    )
  }

  // Blocked rooms report
  if (type === "blocked-rooms-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Inputs */}
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={fetchBlockedRoomData}
              disabled={loading || !fromDate || !toDate}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>

          {/* Report Data Display */}
          {blockedRoomData && (
            <BlockedRoomTable data={blockedRoomData} isLoading={loading} />
          )}
        </CardContent>
      </Card>
    )
  }

  // Rooms transfers report
  if (type === "rooms-transfers-report") {
    return <RoomsTransfersReport />
  }

  // Foreigner report
  if (type === "foreigner-report") {
    return <ForeignerReport />
  }

  // Log report
  if (type === "log-report") {
    return <LogsReport />
  }

  // Default view for other report types
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-muted-foreground">
          {safeConfig.title}
        </h2>
        <p className="text-muted-foreground mt-2">
          {safeConfig.description}
        </p>
      </div>
    </div>
  )
}
