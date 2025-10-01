"use client"

import { useState } from "react"
import { ReportType, REPORT_CONFIGS } from "./report-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Download, Loader2, Printer } from "lucide-react"
import { DateRangePicker } from "./shared/date-range-picker"
import { ReactNode } from "react"

interface StandardReportProps {
  type: ReportType
  children: ReactNode
  onGenerate: () => void
  onExport?: () => void
  loading?: boolean
  hasData?: boolean
  totalRecords?: number
  recordLabel?: string
}

export function StandardReport({
  type,
  children,
  onGenerate,
  onExport,
  loading = false,
  hasData = false,
  totalRecords = 0,
  recordLabel = "records"
}: StandardReportProps) {
  const config = REPORT_CONFIGS[type]
  
  const handlePrint = () => {
    window.print()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Inputs */}
        <DateRangePicker
          fromDate={undefined}
          toDate={undefined}
          onFromDateChange={() => {}}
          onToDateChange={() => {}}
        />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onGenerate}
            disabled={loading}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CalendarIcon className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
          
          {onExport && (
            <Button
              onClick={onExport}
              disabled={!hasData || loading}
              variant="outline"
              className="border-black text-black hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          )}
          
          <Button
            onClick={handlePrint}
            disabled={!hasData}
            variant="outline"
            className="border-black text-black hover:bg-gray-50"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Report Data Display */}
        {hasData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Total {recordLabel}: {totalRecords}
              </h3>
            </div>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
