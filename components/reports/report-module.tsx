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
import { EarlyCheckinLateCheckoutTable } from "./early-checkin-late-checkout"
import { ComplimentaryCheckinTable } from "./complimentary-checkin"
import { StandardReport } from "./shared/standard-report"
import { DaySettlementTable } from "./revenue"

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

interface EarlyCheckinLateCheckoutData {
  total: number
  data: EarlyCheckinLateCheckoutRecord[]
  summary: {
    early_checkins: number
    late_checkouts: number
    total_difference_hours: number
  }
}

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

interface ComplimentaryCheckinData {
  total: number
  data: ComplimentaryCheckinRecord[]
  summary: {
    total_value: number
    approved_count: number
    pending_count: number
    rejected_count: number
  }
}

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

interface DaySettlementData {
  total: number
  data: DaySettlementRecord[]
  summary: {
    total_revenue: number
    total_collections: number
    total_outstanding: number
    average_occupancy: number
    period: string
  }
}

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
  const [earlyCheckinLateCheckoutData, setEarlyCheckinLateCheckoutData] = useState<EarlyCheckinLateCheckoutData | null>(null)
  const [complimentaryCheckinData, setComplimentaryCheckinData] = useState<ComplimentaryCheckinData | null>(null)
  const [daySettlementData, setDaySettlementData] = useState<DaySettlementData | null>(null)
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

  const fetchEarlyCheckinLateCheckoutData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/early-checkin-late-checkout?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch early checkin/late checkout data')
      }
      
      const data = await response.json()
      setEarlyCheckinLateCheckoutData(data)
    } catch (error) {
      console.error('Error fetching early checkin/late checkout data:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const fetchComplimentaryCheckinData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/complimentary-checkin?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch complimentary checkin data')
      }
      
      const data = await response.json()
      setComplimentaryCheckinData(data)
    } catch (error) {
      console.error('Error fetching complimentary checkin data:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const fetchDaySettlementData = async () => {
    if (!fromDate || !toDate) return

    setLoading(true)
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(`/api/reports/day-settlement?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch day settlement data')
      }
      
      const data = await response.json()
      setDaySettlementData(data)
    } catch (error) {
      console.error('Error fetching day settlement data:', error)
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

  // Early checkin/late checkout report
  if (type === "early-checkin-late-checkout-report") {
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
              onClick={fetchEarlyCheckinLateCheckoutData}
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
          {earlyCheckinLateCheckoutData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Total Records: {earlyCheckinLateCheckoutData.total}
                </h3>
              </div>
              <EarlyCheckinLateCheckoutTable data={earlyCheckinLateCheckoutData.data} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Complimentary checkin report
  if (type === "complimentary-checkin-report") {
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
              onClick={fetchComplimentaryCheckinData}
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
          {complimentaryCheckinData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Total Records: {complimentaryCheckinData.total}
                </h3>
              </div>
              <ComplimentaryCheckinTable data={complimentaryCheckinData.data} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Day Settlement report (Revenue)
  if (type === "day-settlement") {
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
              onClick={fetchDaySettlementData}
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
          {daySettlementData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Settlement Period: {daySettlementData.summary.period}
                </h3>
              </div>
              <DaySettlementTable data={daySettlementData.data} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Occupancy Analysis Report (Revenue)
  if (type === "occupancy-analysis-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Sales Day Book Report (Revenue)
  if (type === "sales-day-book-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Daily Status Report (Revenue)
  if (type === "daily-status-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Sales Report (Revenue)
  if (type === "sales-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Roomwise Report (Revenue)
  if (type === "roomwise-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Revenue Chart (Revenue)
  if (type === "revenue-chart") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Revenue Wise Report (Revenue)
  if (type === "revenue-wise-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Referal Commission Report (Revenue)
  if (type === "referal-commission-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // High Balance Report (Revenue)
  if (type === "high-balance-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Collection Report (Revenue)
  if (type === "collection-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Tariff Report (Revenue)
  if (type === "tariff-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
  }

  // Meal Plan Cost Report (Revenue)
  if (type === "meal-plan-cost-report") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <div className="text-muted-foreground">This report section is ready. Data integration is coming soon.</div>
        </CardContent>
      </Card>
    )
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
