"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { maintenanceService, roomService, type Room } from "@/lib/supabase"

interface MaintenancePostingDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  room?: Room | null
  onSuccess: () => void
}

const REQUEST_TYPES = [
  "Plumbing",
  "Electrical",
  "AC",
  "Painting",
  "Deep Clean",
  "Other",
]

export function MaintenancePostingDialog({ open, onOpenChange, room, onSuccess }: MaintenancePostingDialogProps) {
  const { toast } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomId, setRoomId] = useState<string>(room?.id || "")
  const [requestType, setRequestType] = useState<string>(REQUEST_TYPES[0])
  const [requestInfo, setRequestInfo] = useState<string>("")
  const [blockCheckin, setBlockCheckin] = useState<boolean>(true)
  const [fromDate, setFromDate] = useState<string>("")
  const [fromTime, setFromTime] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [toTime, setToTime] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      // defaults
      const now = new Date()
      const end = new Date()
      end.setHours(23, 59, 0, 0)
      setFromDate(now.toISOString().slice(0, 10))
      setFromTime(now.toTimeString().slice(0, 5))
      setToDate(end.toISOString().slice(0, 10))
      setToTime(end.toTimeString().slice(0, 5))
      setRoomId(room?.id || "")

      // fetch rooms (lightweight)
      roomService
        .getRooms()
        .then((r) => setRooms(r))
        .catch(() => setRooms([]))
    }
  }, [open, room?.id])

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === roomId) || room || null, [rooms, roomId, room])

  function toDateTime(dateStr: string, timeStr: string): Date {
    // build local date then convert to Date (local tz)
    const [y, m, d] = dateStr.split("-").map((x) => parseInt(x))
    const [hh, mm] = timeStr.split(":").map((x) => parseInt(x))
    const dt = new Date()
    dt.setFullYear(y, (m || 1) - 1, d || 1)
    dt.setHours(hh || 0, mm || 0, 0, 0)
    return dt
  }

  const handleSubmit = async () => {
    try {
      if (!roomId) {
        toast({ title: "Room required", description: "Please select a room." , variant: "destructive"})
        return
    }
      const from = toDateTime(fromDate, fromTime)
      const to = toDateTime(toDate, toTime)
      if (to.getTime() <= from.getTime()) {
        toast({ title: "Invalid time window", description: "To time must be after From time." , variant: "destructive"})
        return
      }

      setLoading(true)

      // Overlap check (warning/confirm)
      const hasOverlap = await maintenanceService.hasOverlap(roomId, from.toISOString(), to.toISOString())
      if (hasOverlap) {
        const proceed = confirm("This window overlaps an existing reservation/check-in. Do you want to proceed?")
        if (!proceed) { setLoading(false); return }
      }

      await maintenanceService.createMaintenanceBlock({
        roomId,
        requestType,
        requestInfo,
        blockCheckin,
        from,
        to,
        staffId: null,
      })

      toast({ title: "Saved", description: "Maintenance request posted successfully." })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Could not post maintenance.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Post Maintenance Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Room No</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.number} ({r.room_type?.name || ''})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Request Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Request Type" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Request Info</Label>
            <Textarea value={requestInfo} onChange={(e) => setRequestInfo(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="flex items-center gap-2 mt-6">
              <Checkbox id="blockCheckin" checked={blockCheckin} onCheckedChange={(v) => setBlockCheckin(Boolean(v))} />
              <Label htmlFor="blockCheckin">Block Check-in</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>From Time</Label>
              <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <Label>To Time</Label>
              <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Exit</Button>
          <Button onClick={handleSubmit} disabled={loading || !roomId}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


