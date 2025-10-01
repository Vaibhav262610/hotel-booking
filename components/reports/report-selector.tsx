"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReportType, REPORT_CONFIGS, NON_REVENUE_REPORTS, REVENUE_REPORTS } from "./report-types"
import { LayoutGrid, BarChart3 } from "lucide-react"

interface ReportSelectorProps {
  userRole?: string
}

export function ReportSelector({ userRole = "admin" }: ReportSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentType = (searchParams.get('type') as ReportType) || "day-settlement"

  const handleReportChange = (newType: ReportType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', newType)
    router.push(`/reports?${params.toString()}`)
  }

  // Filter reports based on user role
  const canAccessReport = (reportType: string) => {
    if (userRole === "admin" || userRole === "owner") return true

    // Front office staff can only see day settlement report
    if (userRole === "front_office") {
      return reportType === "day-settlement"
    }

    return false
  }

  const filteredNonRevenueReports = NON_REVENUE_REPORTS.filter(type => canAccessReport(type))
  const filteredRevenueReports = REVENUE_REPORTS.filter(type => canAccessReport(type))

  return (
    <div className="flex gap-2">
      <Select value={currentType} onValueChange={handleReportChange}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a report type" />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <LayoutGrid className="h-3 w-3" />
              NON-REVENUE REPORTS
            </div>
            {filteredNonRevenueReports.map((type) => {
              const config = REPORT_CONFIGS[type]
              return (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <span>{config.title}</span>
                  </div>
                </SelectItem>
              )
            })}
          </div>
          <div className="p-2 border-t">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <BarChart3 className="h-3 w-3" />
              REVENUE REPORTS
            </div>
            {filteredRevenueReports.map((type) => {
              const config = REPORT_CONFIGS[type]
              return (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <span>{config.title}</span>
                  </div>
                </SelectItem>
              )
            })}
          </div>
        </SelectContent>
      </Select>
    </div>
  )
}
