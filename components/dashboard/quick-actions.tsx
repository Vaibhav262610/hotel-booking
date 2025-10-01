"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck, CalendarIcon, ClipboardCheck } from "lucide-react"
import { CheckInDialog } from "./dialogs/checkin-dialog"
import { CheckOutDialog } from "./dialogs/checkout-dialog"
import { NewReservationDialog } from "./dialogs/new-reservation-dialog"
import { HousekeepingDialog } from "./dialogs/housekeeping-dialog"
import { Booking, Room, Staff } from "./types"

interface QuickActionsProps {
  bookings: Booking[]
  rooms: Room[]
  staff: Staff[]
  onRefresh: () => void
}

export function QuickActions({ bookings, rooms, staff, onRefresh }: QuickActionsProps) {
  const [isCheckInGuestOpen, setIsCheckInGuestOpen] = useState(false)
  const [isCheckOutGuestOpen, setIsCheckOutGuestOpen] = useState(false)
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false)
  const [isHousekeepingOpen, setIsHousekeepingOpen] = useState(false)

  const handleSuccess = () => {
    onRefresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CheckInDialog
          open={isCheckInGuestOpen}
          onOpenChange={setIsCheckInGuestOpen}
          bookings={bookings}
          onSuccess={handleSuccess}
        />
        <Button 
          className="w-full justify-start bg-transparent" 
          variant="outline"
          onClick={() => setIsCheckInGuestOpen(true)}
        >
          <UserCheck className="w-4 h-4 mr-2" />
          Check-in Guest
        </Button>

        <CheckOutDialog
          open={isCheckOutGuestOpen}
          onOpenChange={setIsCheckOutGuestOpen}
          bookings={bookings}
          onSuccess={handleSuccess}
        />
        <Button 
          className="w-full justify-start bg-transparent" 
          variant="outline"
          onClick={() => setIsCheckOutGuestOpen(true)}
        >
          <UserCheck className="w-4 h-4 mr-2" />
          Check-out Guest
        </Button>

        <NewReservationDialog
          open={isNewReservationOpen}
          onOpenChange={setIsNewReservationOpen}
          rooms={rooms}
          staff={staff}
          onSuccess={handleSuccess}
        />
        <Button 
          className="w-full justify-start bg-transparent" 
          variant="outline"
          onClick={() => setIsNewReservationOpen(true)}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          New Reservation
        </Button>

        <HousekeepingDialog
          open={isHousekeepingOpen}
          onOpenChange={setIsHousekeepingOpen}
          rooms={rooms}
          staff={staff}
          onSuccess={handleSuccess}
        />
        <Button 
          className="w-full justify-start bg-transparent" 
          variant="outline"
          onClick={() => setIsHousekeepingOpen(true)}
        >
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Housekeeping Tasks
        </Button>
      </CardContent>
    </Card>
  )
}
