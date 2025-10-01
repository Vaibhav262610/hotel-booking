'use client'

import React, { useState, useEffect } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { 
  Download, 
  Calendar, 
  FileText, 
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  AlertTriangle
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { bookingService } from '@/lib/supabase'

interface CheckoutReport {
  bookingNumber: string
  guestName: string
  roomNumber: string
  scheduledCheckout: string
  actualCheckout: string
  status: 'on_time' | 'early' | 'late' | 'grace_period'
  lateFee: number
  totalAmount: number
  finalAmount: number
}

export function CheckoutReports() {
  const { toast } = useToast()
  const [reports, setReports] = useState<CheckoutReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7')
  const [reportType, setReportType] = useState('daily')

  useEffect(() => {
    loadReports()
  }, [dateRange, reportType])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      // This would typically fetch from your API
      // For now, we'll simulate the data
      const mockReports: CheckoutReport[] = [
        {
          bookingNumber: 'BK001',
          guestName: 'John Doe',
          roomNumber: '101',
          scheduledCheckout: '2024-01-25T11:00:00Z',
          actualCheckout: '2024-01-25T11:15:00Z',
          status: 'on_time',
          lateFee: 0,
          totalAmount: 5000,
          finalAmount: 5000
        },
        {
          bookingNumber: 'BK002',
          guestName: 'Jane Smith',
          roomNumber: '102',
          scheduledCheckout: '2024-01-25T11:00:00Z',
          actualCheckout: '2024-01-25T12:30:00Z',
          status: 'grace_period',
          lateFee: 0,
          totalAmount: 4500,
          finalAmount: 4500
        },
        {
          bookingNumber: 'BK003',
          guestName: 'Bob Johnson',
          roomNumber: '103',
          scheduledCheckout: '2024-01-25T11:00:00Z',
          actualCheckout: '2024-01-25T14:00:00Z',
          status: 'late',
          lateFee: 200,
          totalAmount: 6000,
          finalAmount: 6200
        }
      ]
      setReports(mockReports)
    } catch (error) {
      console.error('Failed to load reports:', error)
      toast({
        title: "Error",
        description: "Failed to load checkout reports",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Booking Number',
      'Guest Name',
      'Room Number',
      'Scheduled Checkout',
      'Actual Checkout',
      'Status',
      'Late Fee',
      'Total Amount',
      'Final Amount'
    ]

    const csvContent = [
      headers.join(','),
      ...reports.map(report => [
        report.bookingNumber,
        report.guestName,
        report.roomNumber,
        format(new Date(report.scheduledCheckout), 'yyyy-MM-dd HH:mm'),
        format(new Date(report.actualCheckout), 'yyyy-MM-dd HH:mm'),
        report.status.replace('_', ' '),
        report.lateFee,
        report.totalAmount,
        report.finalAmount
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `checkout-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_time':
        return <Badge variant="default" className="bg-green-100 text-green-800">On Time</Badge>
      case 'early':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Early</Badge>
      case 'late':
        return <Badge variant="destructive">Late</Badge>
      case 'grace_period':
        return <Badge variant="outline" className="text-orange-600">Grace Period</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const summaryStats = reports.reduce((acc, report) => {
    acc.totalCheckouts++
    if (report.status === 'on_time') acc.onTime++
    if (report.status === 'early') acc.early++
    if (report.status === 'late') acc.late++
    if (report.status === 'grace_period') acc.gracePeriod++
    acc.totalLateFees += report.lateFee
    acc.totalRevenue += report.finalAmount
    return acc
  }, {
    totalCheckouts: 0,
    onTime: 0,
    early: 0,
    late: 0,
    gracePeriod: 0,
    totalLateFees: 0,
    totalRevenue: 0
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Checkout Reports</h2>
          <p className="text-muted-foreground">
            Detailed checkout reports and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checkouts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalCheckouts}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange === '1' ? 'Today' : `Last ${dateRange} days`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Time</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.onTime}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.totalCheckouts > 0 ? Math.round((summaryStats.onTime / summaryStats.totalCheckouts) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{summaryStats.totalLateFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {summaryStats.late} late checkouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{summaryStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Including late fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Checkout Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
              <p className="text-muted-foreground">No checkout data available for the selected period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Late Fee</TableHead>
                  <TableHead>Final Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{report.bookingNumber}</TableCell>
                    <TableCell>{report.guestName}</TableCell>
                    <TableCell>{report.roomNumber}</TableCell>
                    <TableCell>{format(new Date(report.scheduledCheckout), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>{format(new Date(report.actualCheckout), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      {report.lateFee > 0 ? (
                        <span className="text-red-600 font-medium">₹{report.lateFee}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">₹{report.finalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
