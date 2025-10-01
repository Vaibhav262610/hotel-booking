'use client'

import React, { useState, useEffect } from 'react'
import { format, differenceInMinutes } from 'date-fns'
import { 
  Clock, 
  AlertTriangle, 
  Bell, 
  DollarSign, 
  X, 
  RefreshCw,
  CheckCircle2,
  Timer
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { bookingService } from '@/lib/supabase'
import type { Staff } from '@/lib/supabase'

interface CheckoutNotificationsProps {
  currentStaff?: Staff
}

export function CheckoutNotifications({ currentStaff }: CheckoutNotificationsProps) {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<CheckoutNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const alerts = await bookingService.getActiveCheckoutAlerts()
      setNotifications(alerts)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast({
        title: "Error",
        description: "Failed to load checkout notifications",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadNotifications()
    setRefreshing(false)
  }

  const handleDismissNotification = async (notificationId: string) => {
    if (!currentStaff) {
      toast({
        title: "Error",
        description: "Staff information required to dismiss notifications",
        variant: "destructive",
      })
      return
    }

    try {
      await bookingService.dismissNotification(notificationId, currentStaff.id)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      toast({
        title: "Success",
        description: "Notification dismissed",
      })
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
      toast({
        title: "Error",
        description: "Failed to dismiss notification",
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approaching':
        return <Clock className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'grace_period':
        return <Timer className="h-4 w-4" />
      case 'late_charges':
        return <DollarSign className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'approaching':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'grace_period':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'late_charges':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'approaching':
        return <Badge variant="outline" className="text-yellow-600">Approaching</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      case 'grace_period':
        return <Badge variant="secondary" className="text-blue-600">Grace Period</Badge>
      case 'late_charges':
        return <Badge variant="outline" className="text-orange-600">Late Charges</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const getTimeRemaining = (checkOutTime: string) => {
    const now = new Date()
    const checkout = new Date(checkOutTime)
    const diffMinutes = differenceInMinutes(checkout, now)
    
    if (diffMinutes < 0) {
      return `Overdue by ${Math.abs(diffMinutes)} minutes`
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes remaining`
    } else {
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      return `${hours}h ${minutes}m remaining`
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Checkout Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading notifications...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Checkout Notifications
            {notifications.length > 0 && (
              <Badge variant="secondary">{notifications.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-500">No pending checkout notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${getNotificationColor(notification.notification_type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getNotificationIcon(notification.notification_type)}
                        {getNotificationBadge(notification.notification_type)}
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-medium">
                          {notification.guest_name} - Room {notification.room_number}
                        </h4>
                        
                        <p className="text-sm opacity-90">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs opacity-75">
                          <span>
                            Checkout: {format(new Date(notification.check_out_time), 'MMM dd, HH:mm')}
                          </span>
                          <span>
                            {getTimeRemaining(notification.check_out_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissNotification(notification.id)}
                      className="h-8 w-8 p-0 hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
