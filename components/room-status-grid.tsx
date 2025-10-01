"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { roomService, type Room } from "@/lib/supabase"

const statusConfig = {
  available: { color: "bg-green-500", label: "Available", textColor: "text-green-700" },
  occupied: { color: "bg-red-500", label: "Occupied", textColor: "text-red-700" },
  unclean: { color: "bg-yellow-500", label: "Unclean", textColor: "text-yellow-700" },
  maintenance: { color: "bg-gray-500", label: "Maintenance", textColor: "text-gray-700" },
  cleaning: { color: "bg-blue-500", label: "Cleaning", textColor: "text-blue-700" },
  blocked: { color: "bg-purple-500", label: "Blocked", textColor: "text-purple-700" },
}

export function RoomStatusGrid() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRooms() {
      try {
        const data = await roomService.getRooms()
        setRooms(data)
      } catch (error) {
        console.error("Error fetching rooms:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [])

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading rooms...</div>
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", config.color)} />
            <span className="text-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {rooms.map((room) => {
          const config = statusConfig[room.status as keyof typeof statusConfig]
          return (
            <Card key={room.id} className="relative overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">{room.number}</span>
                  <div className={cn("w-3 h-3 rounded-full", config.color)} />
                </div>
                <div className="text-xs text-muted-foreground mb-1">{room.type}</div>
                <Badge variant="outline" className={cn("text-xs", config.textColor)}>
                  {config.label}
                </Badge>
                <div className="text-xs mt-1 text-muted-foreground">₹{room.price.toLocaleString()}/night</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
