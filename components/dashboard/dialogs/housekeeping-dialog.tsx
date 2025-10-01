"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { housekeepingService } from "@/lib/supabase"
import { Room, Staff } from "../types"

interface HousekeepingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: Room[]
  staff: Staff[]
  onSuccess: () => void
}

export function HousekeepingDialog({ open, onOpenChange, rooms, staff, onSuccess }: HousekeepingDialogProps) {
  const { toast } = useToast()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    try {
      // Validate required fields
      const roomId = formData.get("roomId") as string
      const assignedTo = formData.get("assignedTo") as string
      const taskType = formData.get("taskType") as string
      const priority = formData.get("priority") as string
      const estimatedTime = formData.get("estimatedTime") as string
      
      if (!roomId || !assignedTo || !taskType || !priority || !estimatedTime) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }
      
      // Create housekeeping task
      const taskData = {
        task_number: `HK${Date.now()}`,
        hotel_id: "550e8400-e29b-41d4-a716-446655440000",
        room_id: roomId,
        assigned_to: assignedTo,
        type: taskType,
        status: "pending",
        priority: priority,
        estimated_time: Number.parseInt(estimatedTime),
        notes: formData.get("notes") as string || ""
      }

      await housekeepingService.createTask({
        roomId: taskData.room_id,
        assignedTo: taskData.assigned_to,
        type: taskData.type,
        priority: taskData.priority,
        estimatedTime: taskData.estimated_time,
        notes: taskData.notes
      })

      toast({
        title: "Success",
        description: "Housekeeping task created successfully!",
      })

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error creating housekeeping task:", error)
      toast({
        title: "Error",
        description: "Failed to create housekeeping task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const housekeepingStaff = staff.filter((s) => s.department === "housekeeping")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-theme="light">
        <DialogHeader>
          <DialogTitle>Create Housekeeping Task</DialogTitle>
          <DialogDescription>Assign a housekeeping task</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomId">Room *</Label>
              <Select name="roomId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.number} - {room.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To *</Label>
              <Select name="assignedTo" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {housekeepingStaff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskType">Task Type *</Label>
              <Select name="taskType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="deep-cleaning">Deep Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select name="priority" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
            <Input id="estimatedTime" name="estimatedTime" type="number" defaultValue="30" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <DialogFooter>
            <Button type="submit">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
