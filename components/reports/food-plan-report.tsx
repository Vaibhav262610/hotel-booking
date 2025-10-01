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

interface FoodPlanRecord {
  id: string
  s_no: number
  room_number: string
  booking_number: string
  guest_name: string
  checkin_date: string
  expected_checkout: string
  meal_plan: string
  pax: number
  extra_pax: number
  children: number
  total_pax: number
}

interface FoodPlanReportProps {
  loading?: boolean
}

export function FoodPlanReport({ loading = false }: FoodPlanReportProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
  const [toDate, setToDate] = useState<Date | undefined>(new Date())
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('all')
  const [lastGeneratedMealPlan, setLastGeneratedMealPlan] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<FoodPlanRecord[]>([])

  const { toast } = useToast()

  const mealPlanOptions = ['all', 'CP', 'MAP', 'EP']

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
      
      const endpoint = `/api/reports/food-plan?fromDate=${fromDateStr}&toDate=${toDateStr}&mealPlan=${selectedMealPlan}`
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setReportData(result.data)
        setLastGeneratedMealPlan(selectedMealPlan)
        toast({
          title: "Report Generated",
          description: `Food plan report generated from ${format(fromDate, "dd-MM-yyyy")} to ${format(toDate, "dd-MM-yyyy")}`,
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

  // Group data by meal plan when showing all
  const groupedData = lastGeneratedMealPlan === 'all' 
    ? reportData.reduce((acc, record) => {
        const plan = record.meal_plan
        if (!acc[plan]) acc[plan] = []
        acc[plan].push(record)
        return acc
      }, {} as Record<string, FoodPlanRecord[]>)
    : { [lastGeneratedMealPlan]: reportData }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Food Plan Report</span>
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

            {/* Meal Plan Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Meal Plan Filter</label>
              <div className="flex gap-4">
                {mealPlanOptions.map((plan) => (
                  <label key={plan} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={plan}
                      checked={selectedMealPlan === plan}
                      onChange={(e) => setSelectedMealPlan(e.target.value)}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {plan === 'all' ? 'All Plans' : plan}
                    </span>
                  </label>
                ))}
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
        <div className="space-y-6">
          {Object.entries(groupedData).map(([mealPlan, records]) => (
            <Card key={mealPlan}>
              <CardHeader>
                <CardTitle>
                  {(() => {
                    const guests = records.reduce((sum: number, r: any) => sum + (r.total_pax || 0), 0)
                    const title = lastGeneratedMealPlan === 'all' ? `${mealPlan} Plan` : `${mealPlan} Plan`
                    return `${title} (${guests} guests)`
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">S.No</TableHead>
                        <TableHead>Room Number</TableHead>
                        <TableHead>Booking Number</TableHead>
                        <TableHead>Guest Name</TableHead>
                        <TableHead>Check-in Date</TableHead>
                        <TableHead>Expected Checkout</TableHead>
                        <TableHead>Meal Plan</TableHead>
                        <TableHead>PAX</TableHead>
                        <TableHead>Extra PAX</TableHead>
                        <TableHead>Children</TableHead>
                        <TableHead>Total PAX</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.s_no}</TableCell>
                          <TableCell>{record.room_number}</TableCell>
                          <TableCell>{record.booking_number}</TableCell>
                          <TableCell>{record.guest_name}</TableCell>
                          <TableCell>
                            {record.checkin_date 
                              ? format(new Date(record.checkin_date), "dd/MM/yyyy HH:mm")
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            {record.expected_checkout 
                              ? format(new Date(record.expected_checkout), "dd/MM/yyyy")
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>{record.meal_plan}</TableCell>
                          <TableCell>{record.pax}</TableCell>
                          <TableCell>{record.extra_pax}</TableCell>
                          <TableCell>{record.children}</TableCell>
                          <TableCell>{record.total_pax}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {reportData.length === 0 && !isGenerating && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <p>No data available for the selected criteria.</p>
              <p className="text-sm mt-1">Generate report to view data.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
