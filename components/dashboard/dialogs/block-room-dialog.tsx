"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { roomService, blockedRoomService, type Room, staffService, type Staff } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface BlockRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onSuccess: () => void
}

export function BlockRoomDialog({ open, onOpenChange, room, onSuccess }: BlockRoomDialogProps) {
  const { toast } = useToast()
  const PRESET_REASONS = [
    "Deep cleaning",
    "Plumbing repair",
    "Electrical maintenance",
    "AC service",
    "Painting",
    "Pest control",
    "Other"
  ]

  const [reason, setReason] = useState("")
  const [fromDate, setFromDate] = useState<string>("")
  const [fromTime, setFromTime] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [toTime, setToTime] = useState<string>("")
  const [blockedBy, setBlockedBy] = useState<string>("") // staff id
  const [blockedByName, setBlockedByName] = useState<string>("")
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setReason("")
    setFromDate("")
    setFromTime("")
    setToDate("")
    setToTime("")
    setBlockedBy("")
  }

  // Set default dates and current staff on open
  useEffect(() => {
    if (open) {
      const today = new Date()
      const yyyy = today.toISOString().slice(0, 10)
      setFromDate(yyyy)
      setToDate(yyyy)
      setFromTime("12:00")
      setToTime("12:30")
      // Load staff and set default current staff
      ;(async () => {
        try {
          const staff = await staffService.getStaff()
          setStaffList(staff)
          // Resolve current staff id from localStorage or pick first
          let staffId = ""
          try { staffId = localStorage.getItem("staff_id") || "" } catch {}
          let current = staff.find(s => s.id === staffId) || staff[0]
          if (current) {
            setBlockedBy(current.id)
            setBlockedByName(current.name || "")
          }
        } catch (e) {
          // fallback keeps fields empty but read-only
        }
      })()
    } else {
      reset()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!room) return

    try {
      setSubmitting(true)
      if (!blockedBy) {
        toast({ title: "Missing Staff", description: "Unable to determine current staff. Please re-open the dialog.", variant: "destructive" })
        return
      }
      // Build date-only strings for RPC (expects DATE, not time)
      const todayStr = new Date().toISOString().slice(0, 10)
      const fromDateStr = (fromDate || todayStr)
      let toDateStr = (toDate || fromDate || todayStr)

      // Validate order. If equal, extend to next day to satisfy DB check (> not >=)
      const fromDateObj = new Date(`${fromDateStr}T00:00:00`)
      let toDateObj = new Date(`${toDateStr}T00:00:00`)
      if (toDateObj < fromDateObj) {
        toast({ title: "Invalid date range", description: "End time must be after start time.", variant: "destructive" })
        return
      }
      if (toDateObj.getTime() === fromDateObj.getTime()) {
        toDateObj.setDate(toDateObj.getDate() + 1)
        toDateStr = toDateObj.toISOString().slice(0, 10)
      }

      // Use blockedRoomService to create a proper block record (enforced by DB)
      await blockedRoomService.blockRoom({
        room_id: room.id,
        blocked_by_staff_id: blockedBy,
        blocked_from_date: fromDateObj,
        blocked_to_date: toDateObj,
        reason: reason || "Maintenance",
        notes: undefined
      })

      toast({ title: "Room blocked", description: `Room ${room.number} marked as blocked.` })
      onOpenChange(false)
      reset()
      onSuccess()
    } catch (error) {
      console.error("Failed to block room:", error)
      toast({ title: "Error", description: "Could not block room", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block Room {room?.number}</DialogTitle>
          <DialogDescription>Provide details for the room block.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={reason === "Other" ? "" : reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Deep cleaning, repair" disabled={reason !== "Other"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>From Time</Label>
              <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Time</Label>
              <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Blocked By</Label>
            <Input value={blockedByName} readOnly placeholder="Staff name" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!room || submitting} className="w-full">Block Room</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


