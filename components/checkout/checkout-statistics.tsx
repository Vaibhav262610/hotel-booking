'use client'

import React, { useState, useEffect } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle2,
  Calendar,
  RefreshCw
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { bookingService } from '@/lib/supabase'

interface CheckoutStats {
  totalCheckouts: number
  onTimeCheckouts: number
  lateCheckouts: number
  gracePeriodUsed: number
  totalLateFees: number
  averageLateTime: number
}

export function CheckoutStatistics() {
  const { toast } = useToast()
  const [stats, setStats] = useState<CheckoutStats>({
    totalCheckouts: 0,
    onTimeCheckouts: 0,
    lateCheckouts: 0,
    gracePeriodUsed: 0,
    totalLateFees: 0,
    averageLateTime: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7') // Default to last 7 days

  useEffect(() => {
    loadStatistics()
  }, [dateRange])

  const loadStatistics = async () => {
    try {
      setIsLoading(true)
      const days = parseInt(dateRange)
      const startDate = startOfDay(subDays(new Date(), days))
      const endDate = endOfDay(new Date())
      
      const statistics = await bookingService.getCheckoutStatistics(startDate, endDate)
      setStats(statistics)
    } catch (error) {
      console.error('Failed to load checkout statistics:', error)
      toast({
        title: "Error",
        description: "Failed to load checkout statistics",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onTimePercentage = stats.totalCheckouts > 0 
    ? Math.round((stats.onTimeCheckouts / stats.totalCheckouts) * 100) 
    : 0

  const latePercentage = stats.totalCheckouts > 0 
    ? Math.round((stats.lateCheckouts / stats.totalCheckouts) * 100) 
    : 0

  const gracePeriodPercentage = stats.totalCheckouts > 0 
    ? Math.round((stats.gracePeriodUsed / stats.totalCheckouts) * 100) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Checkout Analytics</h2>
          <p className="text-muted-foreground">
            Monitor checkout performance and timing trends
          </p>
        </div>
        
        <div className="flex items-center gap-4">
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadStatistics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checkouts</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCheckouts}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange === '1' ? 'Today' : `Last ${dateRange} days`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Time Rate</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onTimePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.onTimeCheckouts} of {stats.totalCheckouts} checkouts
            </p>
            <Progress value={onTimePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Checkouts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lateCheckouts}</div>
            <p className="text-xs text-muted-foreground">
              {latePercentage}% of total checkouts
            </p>
            <Progress value={latePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Late Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{stats.totalLateFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Collected from late checkouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grace Period Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Grace Period Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Grace Period Used</span>
              <Badge variant="secondary">{stats.gracePeriodUsed}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Grace Period Rate</span>
                <span>{gracePeriodPercentage}%</span>
              </div>
              <Progress value={gracePeriodPercentage} />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Average Late Time:</strong> {stats.averageLateTime.toFixed(1)} hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">On-Time Performance</span>
                <div className="flex items-center gap-2">
                  <Progress value={onTimePercentage} className="w-20" />
                  <span className="text-sm font-medium">{onTimePercentage}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Late Checkout Rate</span>
                <div className="flex items-center gap-2">
                  <Progress value={latePercentage} className="w-20" />
                  <span className="text-sm font-medium">{latePercentage}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Grace Period Usage</span>
                <div className="flex items-center gap-2">
                  <Progress value={gracePeriodPercentage} className="w-20" />
                  <span className="text-sm font-medium">{gracePeriodPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Performance Rating */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Performance</span>
                <Badge 
                  variant={onTimePercentage >= 90 ? "default" : onTimePercentage >= 75 ? "secondary" : "destructive"}
                >
                  {onTimePercentage >= 90 ? "Excellent" : onTimePercentage >= 75 ? "Good" : "Needs Improvement"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {stats.totalCheckouts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">On-Time Checkouts</h4>
                <p className="text-green-700">
                  {stats.onTimeCheckouts} guests ({onTimePercentage}%) checked out on time
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-1">Late Checkouts</h4>
                <p className="text-orange-700">
                  {stats.lateCheckouts} guests ({latePercentage}%) were late
                  {stats.gracePeriodUsed > 0 && (
                    <span>, {stats.gracePeriodUsed} used grace period</span>
                  )}
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">Revenue Impact</h4>
                <p className="text-blue-700">
                  ₹{stats.totalLateFees.toFixed(2)} collected in late fees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
