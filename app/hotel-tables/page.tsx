"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Database, CheckCircle, AlertCircle } from "lucide-react"

export default function HotelTablesPage() {
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<string[]>([])
  const { toast } = useToast()

  const hotels = [
    { id: 'hotel_001', name: 'Hotel 001', prefix: 'hotel001_' },
    { id: 'hotel_002', name: 'Hotel 002', prefix: 'hotel002_' }
  ]

  const createTables = async (hotelId: string) => {
    try {
      setCreating(true)
      
      const response = await fetch('/api/hotel/create-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tables')
      }

      setCreated(prev => [...prev, hotelId])
      
      toast({
        title: "Success",
        description: `Tables created for ${hotelId}`,
      })

    } catch (error: any) {
      console.error('Error creating tables:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const createAllTables = async () => {
    for (const hotel of hotels) {
      await createTables(hotel.id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-6 w-6 mr-2" />
              Hotel Database Tables Management
            </CardTitle>
            <CardDescription>
              Create separate tables for each hotel to ensure complete data isolation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{hotel.name}</h3>
                      <Badge variant="outline">{hotel.prefix}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Tables:</strong></p>
                      <ul className="ml-4 space-y-1">
                        <li>• {hotel.prefix}staff</li>
                        <li>• {hotel.prefix}guests</li>
                        <li>• {hotel.prefix}room_types</li>
                        <li>• {hotel.prefix}rooms</li>
                        <li>• {hotel.prefix}bookings</li>
                        <li>• {hotel.prefix}booking_rooms</li>
                        <li>• {hotel.prefix}payment_breakdown</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {created.includes(hotel.id) && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Created
                      </div>
                    )}
                    <Button
                      onClick={() => createTables(hotel.id)}
                      disabled={creating || created.includes(hotel.id)}
                      size="sm"
                    >
                      {creating ? "Creating..." : "Create Tables"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={createAllTables}
                disabled={creating}
                className="w-full"
              >
                {creating ? "Creating All..." : "Create All Hotel Tables"}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Important Notes:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Each hotel will have completely separate tables</li>
                <li>• Hotel 001 data will be in tables prefixed with "hotel001_"</li>
                <li>• Hotel 002 data will be in tables prefixed with "hotel002_"</li>
                <li>• No data sharing between hotels - complete isolation</li>
                <li>• Create tables before creating users</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
