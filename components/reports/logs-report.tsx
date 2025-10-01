"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "./shared/date-range-picker"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { LogReportType, LOG_REPORT_CONFIGS } from "./report-types"
import { useToast } from "@/components/ui/use-toast"
import { ArrivalLogTable } from "./arrival-log-table"

export function LogsReport() {
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [selectedLogType, setSelectedLogType] = useState<LogReportType | "">("")
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const { toast } = useToast()

  const handleGenerateReport = async () => {
    if (!fromDate || !toDate || !selectedLogType) {
      toast({
        title: "Missing Information",
        description: "Please select a log report type and date range.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    setGenerated(false)

    try {
      const fromDateStr = format(fromDate, "yyyy-MM-dd")
      const toDateStr = format(toDate, "yyyy-MM-dd")
      
      // TODO: Replace with actual API endpoint based on selectedLogType
      const response = await fetch(`/api/reports/logs/${selectedLogType}?fromDate=${fromDateStr}&toDate=${toDateStr}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch log report data')
      }
      
      const data = await response.json()
      
      setReportData(data)
      setGenerated(true)
      toast({
        title: "Report Generated",
        description: `${LOG_REPORT_CONFIGS[selectedLogType].title} has been generated successfully.`,
      })
      
    } catch (error) {
      console.error('Error fetching log report data:', error)
      toast({
        title: "Error",
        description: "Failed to generate the log report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const renderReportContent = () => {
    if (!generated || !reportData) return null

    // Handle arrival report specifically
    if (selectedLogType === "arrival-report") {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {LOG_REPORT_CONFIGS[selectedLogType as LogReportType]?.title} Results
          </h3>
          <div className="text-sm text-muted-foreground">
            Total Bookings: {reportData.total}
          </div>
          <ArrivalLogTable data={reportData.data} />
        </div>
      )
    }

    // Default for other report types
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {LOG_REPORT_CONFIGS[selectedLogType as LogReportType]?.title} Results
        </h3>
        <div className="border p-4 text-center text-muted-foreground">
          Report content will be implemented for {selectedLogType} in the next phase.
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Log Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Picker */}
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        />

        {/* Log Report Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Log Report Type</label>
          <Select value={selectedLogType} onValueChange={(value) => setSelectedLogType(value as LogReportType)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a log report type..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOG_REPORT_CONFIGS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{config.title}</span>
                    <span className="text-xs text-muted-foreground">{config.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleGenerateReport}
            disabled={loading || !fromDate || !toDate || !selectedLogType}
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

        {/* Report Content */}
        {renderReportContent()}
      </CardContent>
    </Card>
  )
}
