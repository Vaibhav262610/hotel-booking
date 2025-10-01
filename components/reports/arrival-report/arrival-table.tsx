"use client"

import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

interface ArrivalTableProps {
  data: ArrivalRecord[]
  loading?: boolean
}

export function ArrivalTable({ data, loading }: ArrivalTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Arrival Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading arrival data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Arrival Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">No arrival data found for the selected date range.</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm')
    } catch {
      return 'N/A'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy')
    } catch {
      return 'N/A'
    }
  }

  // Group data by meal plan
  const groupedData = data.reduce((acc, record) => {
    const mealPlan = record.meal_plan || 'EP'
    if (!acc[mealPlan]) {
      acc[mealPlan] = []
    }
    acc[mealPlan].push(record)
    return acc
  }, {} as Record<string, ArrivalRecord[]>)

  const mealPlanOrder = ['EP', 'CP', 'MAP']
  const orderedMealPlans = mealPlanOrder.filter(plan => groupedData[plan]?.length > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arrival Report</CardTitle>
        <p className="text-sm text-muted-foreground">
          Showing {data.length} arrival(s) for the selected date range
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {orderedMealPlans.map((mealPlan) => (
            <div key={mealPlan} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {mealPlan} - {groupedData[mealPlan].length} arrival(s)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meal Plan</TableHead>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Arrival Mode</TableHead>
                      <TableHead>OTA/Company</TableHead>
                      <TableHead>Arrival Date</TableHead>
                      <TableHead>Departure Time</TableHead>
                      <TableHead>Planned Nights</TableHead>
                      <TableHead>Pax</TableHead>
                      <TableHead>Child Pax</TableHead>
                      <TableHead>Total Rooms</TableHead>
                      <TableHead>Deluxe</TableHead>
                      <TableHead>Deluxe Triple</TableHead>
                      <TableHead>Deluxe Quad</TableHead>
                      <TableHead>King Suite</TableHead>
                      <TableHead>Residential Suite</TableHead>
                      <TableHead>Advance Paid</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Booking Staff</TableHead>
                      <TableHead>Booked On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedData[mealPlan].map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.meal_plan}</TableCell>
                        <TableCell className="font-medium">
                          {record.booking_number}
                        </TableCell>
                        <TableCell>{record.guest_name}</TableCell>
                        <TableCell>{record.arrival_type}</TableCell>
                        <TableCell>{record.ota_company}</TableCell>
                        <TableCell>{formatDateTime(record.arrival_date)}</TableCell>
                        <TableCell>{formatDateTime(record.departure_time)}</TableCell>
                        <TableCell>{record.planned_nights}</TableCell>
                        <TableCell>{record.pax}</TableCell>
                        <TableCell>{record.child_pax}</TableCell>
                        <TableCell>{record.total_rooms}</TableCell>
                        <TableCell>{record.deluxe_count}</TableCell>
                        <TableCell>{record.deluxe_triple_count}</TableCell>
                        <TableCell>{record.deluxe_quad_count}</TableCell>
                        <TableCell>{record.king_suite_count}</TableCell>
                        <TableCell>{record.residential_suite_count}</TableCell>
                        <TableCell>{formatCurrency(record.advance_paid)}</TableCell>
                        <TableCell>{formatCurrency(record.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(record.outstanding_amount)}</TableCell>
                        <TableCell>{record.booking_staff_name}</TableCell>
                        <TableCell>{formatDate(record.booked_on)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
