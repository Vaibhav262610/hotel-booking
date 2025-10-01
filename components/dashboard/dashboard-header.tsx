"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, CalendarIcon } from "lucide-react"
import { QuickCheckinDialog } from "./dialogs/quick-checkin-dialog"
import { NewBookingDialog } from "./dialogs/new-booking-dialog"
import { Room, Staff } from "./types"

interface DashboardHeaderProps {
  currentDate: string
  rooms: Room[]
  staff: Staff[]
  onRefresh: () => void
}

export function DashboardHeader({ currentDate, rooms, staff, onRefresh }: DashboardHeaderProps) {
  const [isQuickCheckinOpen, setIsQuickCheckinOpen] = useState(false)
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    onRefresh()
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Hotel Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today - {currentDate}</p>
      </div>
      <div className="flex gap-2">
        <QuickCheckinDialog
          open={isQuickCheckinOpen}
          onOpenChange={setIsQuickCheckinOpen}
          rooms={rooms}
          staff={staff}
          onSuccess={handleSuccess}
        />

        <NewBookingDialog
          open={isNewBookingOpen}
          onOpenChange={setIsNewBookingOpen}
          rooms={rooms}
          staff={staff}
          onSuccess={handleSuccess}
        />
        <Button variant="outline" onClick={() => router.push('/make-booking')}>
          <CalendarIcon className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>
    </div>
  )
}
