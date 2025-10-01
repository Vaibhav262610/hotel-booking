"use client"

import { useState } from "react"
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
import { Loader2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { DateRangePicker } from "./shared/date-range-picker"

interface PoliceRecord {
  id: string
  s_no: number
  room_number: string
  guest_name: string
  phone: string | null
  address: string | null
  total_pax: number
  purpose: string
  check_in_time?: string
  check_out_time?: string
  booking_number: string
}

interface PoliceReportProps {
  loading?: boolean
}

export function PoliceReport({ loading = false }: PoliceReportProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [reportType, setReportType] = useState<'checked-in' | 'checked-out'>('checked-in')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<PoliceRecord[]>([])

  const { toast } = useToast()

  const handleReportTypeChange = (newType: 'checked-in' | 'checked-out') => {
    setReportType(newType)
    setReportData([]) // Clear table data when selection changes
  }

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
      const fromDateStr = format(fromDate, "yyyy-MM-dd")
      const toDateStr = format(toDate, "yyyy-MM-dd")
      
      const endpoint = `/api/reports/police-report?fromDate=${fromDateStr}&toDate=${toDateStr}&status=${reportType === 'checked-in' ? 'checked_in' : 'checked_out'}`
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setReportData(result.data)
        toast({
          title: "Report Generated",
          description: `Police ${reportType} report generated from ${format(fromDate, "dd-MM-yyyy")} to ${format(toDate, "dd-MM-yyyy")}`,
          duration: 2000,
        })
      } else {
        throw new Error(result.error || 'Failed to fetch report data')
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch report data. Please try again.",
        variant: "destructive",
        duration: 2000,
      })
      setReportData([])
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Police Report</span>
            {(loading || isGenerating) && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range Picker */}
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
            />

            {/* Report Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="checked-in"
                    checked={reportType === 'checked-in'}
                    onChange={(e) => handleReportTypeChange(e.target.value as 'checked-in' | 'checked-out')}
                    className="rounded"
                  />
                  <span className="text-sm">Checked In</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="checked-out"
                    checked={reportType === 'checked-out'}
                    onChange={(e) => handleReportTypeChange(e.target.value as 'checked-in' | 'checked-out')}
                    className="rounded"
                  />
                  <span className="text-sm">Checked Out</span>
                </label>
              </div>
            </div>

          </div>
          
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
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Data */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {reportType === 'checked-in' ? 'Checked In Guests' : 'Checked Out Guests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">S.No</TableHead>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Total PAX</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>
                      {reportType === 'checked-in' ? 'Check In Time' : 'Check Out Time'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.s_no}</TableCell>
                      <TableCell>{record.room_number}</TableCell>
                      <TableCell>{record.guest_name}</TableCell>
                      <TableCell>{record.phone || 'N/A'}</TableCell>
                      <TableCell>{record.address || 'N/A'}</TableCell>
                      <TableCell>{record.total_pax}</TableCell>
                      <TableCell>{record.purpose}</TableCell>
                      <TableCell>
                        {reportType === 'checked-in' 
                          ? record.check_in_time 
                            ? format(new Date(record.check_in_time), "dd/MM/yyyy HH:mm")
                            : 'N/A'
                          : record.check_out_time 
                            ? format(new Date(record.check_out_time), "dd/MM/yyyy HH:mm")
                            : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {reportData.length === 0 && !isGenerating && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <p>No data available for the selected report type.</p>
              <p className="text-sm mt-1">Generate report to view data.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
