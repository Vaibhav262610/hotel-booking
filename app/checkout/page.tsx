'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { EnhancedCheckoutDialog } from '@/components/checkout/enhanced-checkout-dialog'
import { CheckoutNotifications } from '@/components/checkout/checkout-notifications'
import { CheckoutStatistics } from '@/components/checkout/checkout-statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  BarChart3, 
  Calendar, 
  Clock, 
  Search, 
  User, 
  Bed, 
  Receipt,
  AlertTriangle,
  CheckCircle,
  ClockIcon,
  LogOut
} from 'lucide-react'
import { format, isAfter, isBefore, differenceInHours } from 'date-fns'
import { bookingService } from '@/lib/supabase'
import type { Booking, Staff } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function CheckoutPage() {
  const { toast } = useToast()
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("checkout")

  // Load current staff information
  useEffect(() => {
    const loadCurrentStaff = async () => {
      // TODO: Replace with actual staff loading logic from auth context
      setCurrentStaff({
        id: 'staff-id',
        hotel_id: 'hotel-id',
        name: 'Current User',
        email: 'user@hotel.com',
        phone: '+1234567890',
        role: 'Admin',
        department: 'Front Office',
        status: 'active',
        join_date: '2024-01-01',
        permissions: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      } as Staff)
    }

    loadCurrentStaff()
  }, [])

  // Load bookings for checkout
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true)
        const allBookings = await bookingService.getBookings()
        
        // Filter for checked-in bookings only
        const checkoutReadyBookings = allBookings.filter(booking => 
          booking.status === 'checked_in'
        )
        
        setBookings(checkoutReadyBookings)
        setFilteredBookings(checkoutReadyBookings)
      } catch (error) {
        console.error('Failed to load bookings:', error)
        toast({
          title: "Error",
          description: "Failed to load bookings for checkout.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [toast])

  // Filter bookings based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBookings(bookings)
      return
    }

    const filtered = bookings.filter(booking => 
      booking.guest?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.booking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.booking_rooms?.some(br => 
        br.room?.number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    
    setFilteredBookings(filtered)
  }, [searchQuery, bookings])

  const handleCheckoutClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsCheckoutDialogOpen(true)
  }

  const handleCheckoutSuccess = () => {
    // Refresh bookings after successful checkout
    setBookings(prev => prev.filter(b => b.id !== selectedBooking?.id))
    setFilteredBookings(prev => prev.filter(b => b.id !== selectedBooking?.id))
    setIsCheckoutDialogOpen(false)
    setSelectedBooking(null)
    
    toast({
      title: "Success",
      description: "Guest checked out successfully!",
    })
  }

  const getCheckoutStatus = (booking: Booking) => {
    const now = new Date()
    const expectedCheckout = new Date(booking.expected_checkout)
    const hoursUntilCheckout = differenceInHours(expectedCheckout, now)
    
    if (isAfter(now, expectedCheckout)) {
      return { status: 'overdue', label: 'Overdue', variant: 'destructive' as const }
    } else if (hoursUntilCheckout <= 2 && hoursUntilCheckout > 0) {
      return { status: 'approaching', label: 'Approaching', variant: 'secondary' as const }
    } else if (hoursUntilCheckout <= 0) {
      return { status: 'due', label: 'Due Now', variant: 'destructive' as const }
    } else {
      return { status: 'scheduled', label: 'Scheduled', variant: 'default' as const }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'approaching':
        return <Clock className="h-4 w-4" />
      case 'due':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout Management</h1>
          <p className="text-muted-foreground">
            Manage guest checkouts, monitor notifications, and track performance
          </p>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Checkout
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checkout" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Guest to Checkout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by guest name, booking number, or room number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {filteredBookings.length} guests ready for checkout
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Bookings List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Guests Ready for Checkout
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No guests ready for checkout</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No bookings match your search criteria.' : 'All guests have been checked out or no guests are currently checked in.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                      const checkoutStatus = getCheckoutStatus(booking)
                      const roomNumbers = booking.booking_rooms
                        ?.map(br => br.room?.number)
                        .filter(Boolean)
                        .join(", ") || "N/A"
                      
                      return (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(checkoutStatus.status)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{booking.guest?.name || "N/A"}</h3>
                                  <Badge variant={checkoutStatus.variant}>
                                    {checkoutStatus.label}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Booking: {booking.booking_number} | Rooms: {roomNumbers}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Check-in: {format(new Date(booking.check_in), "MMM dd, yyyy")} | 
                                  Expected Checkout: {format(new Date(booking.expected_checkout), "MMM dd, yyyy")}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-medium">
                                ₹{(booking.payment_breakdown?.taxed_total_amount || booking.payment_breakdown?.total_amount || 0).toFixed(2)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Outstanding: ₹{(booking.payment_breakdown?.outstanding_amount || 0).toFixed(2)}
                              </div>
                            </div>
                            <Button
                              onClick={() => handleCheckoutClick(booking)}
                              className="flex items-center gap-2"
                            >
                              <LogOut className="h-4 w-4" />
                              Checkout
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <CheckoutNotifications currentStaff={currentStaff || undefined} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <CheckoutStatistics />
          </TabsContent>
        </Tabs>

        {/* Checkout Dialog */}
        {selectedBooking && (
          <EnhancedCheckoutDialog
            booking={selectedBooking}
            isOpen={isCheckoutDialogOpen}
            onClose={() => {
              setIsCheckoutDialogOpen(false)
              setSelectedBooking(null)
            }}
            onCheckoutSuccess={handleCheckoutSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  )
}