"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw } from "lucide-react"
import { ReportModule, ReportSelector, ReportType, DEFAULT_REPORT } from "@/components/reports"

// Mock user role - in real app this would come from authentication context
const getUserRole = () => {
  // For demo purposes, you can change this to test different access levels
  return "admin" // "admin" | "owner" | "front_office" | "housekeeping"
}

function ReportsContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const userRole = getUserRole()

  // Get current report type from URL parameters
  const currentReportType = (searchParams.get('type') as ReportType) || DEFAULT_REPORT

  // Check if user has access to specific reports
  const canAccessReport = (reportType: string) => {
    if (userRole === "admin" || userRole === "owner") return true

    // Front office staff can only see day settlement report
    if (userRole === "front_office") {
      return reportType === "day-settlement"
    }

    return false
  }

  // Check if user can access checkin/checkout report
  const canAccessCheckinCheckout = canAccessReport("checkin-checkout")

  const handleRefresh = () => {
      setLoading(true)
    // Simulate loading for now
    setTimeout(() => {
      setLoading(false)
      toast({
        title: "Refreshed",
        description: "Report data has been refreshed",
      })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            {userRole === "admin" 
              ? "Comprehensive reports and analytics for your hotel operations"
              : "Day settlement report for front office operations"
            }
          </p>
          {userRole !== "admin" && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Access Level:</strong> Front Office Staff - You can only view the Day Settlement Report.
                Contact an administrator for access to additional reports.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Report Selector */}
      <ReportSelector userRole={userRole} />

      {/* Dynamic Report Module */}
      {currentReportType === "checkin-checkout" && !canAccessCheckinCheckout ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
            <p className="text-muted-foreground max-w-md">
              You don't have permission to access the Checkin/Checkout Report. 
              This report is only available to administrators and owners.
            </p>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Current Role:</strong> {userRole} - Contact an administrator for access.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ReportModule type={currentReportType} />
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading reports...</div>}>
        <ReportsContent />
      </Suspense>
    </DashboardLayout>
  )
}
