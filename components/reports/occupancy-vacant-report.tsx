"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { EnhancedDateRangePicker } from "./shared/enhanced-date-range-picker"
import { useToast } from "@/hooks/use-toast"

interface OccupancyRecord {
  id: string
  s_no: number
  room_number: string
  room_type: string
  guest_name: string
  mobile?: string
  meal_plan: string
  plan_name: string
  arrival_type: string
  company_ota_agent: string
  booking_id: string
  pax: number
  extra_pax: number
  child_pax: number
  total_pax: number
  tariff?: number
  checkin_date: string
  expected_checkout: string
  planned_nights: number
}

interface VacantRecord {
  room_type: string
  total_rooms: number
  room_numbers_str: string
}

interface BlockedRecord {
  id: string
  s_no: number
  room_number: string
  room_type: string
  blocked_on: string
}

interface ReportMetrics {
  occupancy: {
    number_of_rooms: number
    total_pax: number
  }
  vacant: {
    number_of_vacant: number
    maintenance: number
  }
}

interface OccupancyVacantReportProps {
  loading?: boolean
}

export function OccupancyVacantReport({ loading = false }: OccupancyVacantReportProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [includeMobileNumber, setIncludeMobileNumber] = useState(false)
  const [includeTariff, setIncludeTariff] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<{
    occupancy: OccupancyRecord[]
    vacant: VacantRecord[]
    blocked: BlockedRecord[]
    metrics: ReportMetrics
  } | null>(null)

  const { toast } = useToast()

  const fetchReportData = async () => {
    if (!fromDate || !toDate) {
      toast({
        title: "Date Range Required",
        description: "Please select both from and to dates to generate the report.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      const fromDateStr = format(fromDate, "dd/MM/yyyy")
      const toDateStr = format(toDate, "dd/MM/yyyy")
      
      const response = await fetch(
        `/api/reports/occupancy-vacant?fromDate=${fromDateStr}&toDate=${toDateStr}&includeMobileNumber=${includeMobileNumber}&includeTariff=${includeTariff}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setReportData(result.data)
        toast({
          title: "Report Generated",
          description: `Occupancy/Vacant report generated for ${fromDateStr} to ${toDateStr}`,
        })
      } else {
        throw new Error(result.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }


  // Remove auto-fetch - only generate when user clicks the button

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Occupancy/Vacant Report</span>
            {(loading || isGenerating) && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedDateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            includeMobileNumber={includeMobileNumber}
            onIncludeMobileNumberChange={setIncludeMobileNumber}
            includeTariff={includeTariff}
            onIncludeTariffChange={setIncludeTariff}
          />
          
          <div className="flex gap-2 mt-6">
            <Button 
              onClick={fetchReportData} 
              disabled={isGenerating || !fromDate || !toDate}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Occupancy List */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>OCCUPANCY LIST</CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Number Of Rooms: <strong>{reportData.metrics.occupancy.number_of_rooms}</strong></span>
              <span>Total No. Of Pax: <strong>{reportData.metrics.occupancy.total_pax}</strong></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Rm.No</TableHead>
                    <TableHead>Rm.Type</TableHead>
                    <TableHead>Guest</TableHead>
                    {includeMobileNumber && <TableHead>Mobile</TableHead>}
                    <TableHead>Meal Plan</TableHead>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Arrival Type</TableHead>
                    <TableHead>Company / OTA / Agent</TableHead>
                    <TableHead>Booking Id</TableHead>
                    <TableHead>Pax</TableHead>
                    <TableHead>Extra</TableHead>
                    <TableHead>Child</TableHead>
                    <TableHead>Total</TableHead>
                    {includeTariff && <TableHead>Tariff</TableHead>}
                    <TableHead>Checkin Date</TableHead>
                    <TableHead>Likely Checked Out</TableHead>
                    <TableHead>Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.occupancy.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.s_no}</TableCell>
                      <TableCell className="font-medium">{record.room_number}</TableCell>
                      <TableCell>{record.room_type}</TableCell>
                      <TableCell>{record.guest_name}</TableCell>
                      {includeMobileNumber && (
                        <TableCell>{record.mobile || "-"}</TableCell>
                      )}
                      <TableCell>{record.meal_plan}</TableCell>
                      <TableCell>{record.plan_name}</TableCell>
                      <TableCell>{record.arrival_type}</TableCell>
                      <TableCell>{record.company_ota_agent}</TableCell>
                      <TableCell>{record.booking_id}</TableCell>
                      <TableCell>{record.pax}</TableCell>
                      <TableCell>{record.extra_pax}</TableCell>
                      <TableCell>{record.child_pax}</TableCell>
                      <TableCell className="font-medium">{record.total_pax}</TableCell>
                      {includeTariff && (
                        <TableCell>
                          {record.tariff ? `${record.tariff.toFixed(2)} Inc.Tax` : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        {format(new Date(record.checkin_date), "dd-MM-yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.expected_checkout), "dd-MM-yy HH:mm")}
                      </TableCell>
                      <TableCell>{record.planned_nights}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vacant Status */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>VACANT STATUS</CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Number Of Vacant: <strong>{reportData.metrics.vacant.number_of_vacant}</strong></span>
              <span>Maintenance: <strong>{reportData.metrics.vacant.maintenance}</strong></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Total Rooms</TableHead>
                    <TableHead>Room No</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.vacant.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.room_type}</TableCell>
                      <TableCell>{record.total_rooms}</TableCell>
                      <TableCell>{record.room_numbers_str}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked List */}
      {reportData && reportData.blocked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>BLOCKED LIST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Room No</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Blocked on</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.blocked.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.s_no}</TableCell>
                      <TableCell className="font-medium">{record.room_number}</TableCell>
                      <TableCell>{record.room_type}</TableCell>
                      <TableCell>
                        {format(new Date(record.blocked_on), "dd-MM-yy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
