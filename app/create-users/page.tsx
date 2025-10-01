"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function CreateUsersPage() {
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<string[]>([])
  const { toast } = useToast()

  const users = [
    { hotelId: 'hotel_001', userType: 'owner' },
    { hotelId: 'hotel_001', userType: 'admin' },
    { hotelId: 'hotel_002', userType: 'owner' },
    { hotelId: 'hotel_002', userType: 'admin' }
  ]

  const createUser = async (hotelId: string, userType: string) => {
    try {
      setCreating(true)
      
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, userType })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setCreated(prev => [...prev, `${hotelId}_${userType}`])
      
      toast({
        title: "Success",
        description: `${userType} created for ${hotelId}`,
      })

    } catch (error: any) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const createAllUsers = async () => {
    for (const user of users) {
      await createUser(user.hotelId, user.userType)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Hotel Users</CardTitle>
            <CardDescription>
              Create owner and admin accounts for both hotels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {users.map((user) => {
                const email = `${user.userType}${user.hotelId}@hotel.local`
                const password = `${user.userType}12345`
                const role = user.userType === 'owner' ? 'Owner' : 'Admin'
                const key = `${user.hotelId}_${user.userType}`
                
                return (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{role} - {user.hotelId}</h3>
                      <p className="text-sm text-gray-600">
                        Email: {email} | Password: {password}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {created.includes(key) && (
                        <span className="text-green-600 text-sm">✓ Created</span>
                      )}
                      <Button
                        onClick={() => createUser(user.hotelId, user.userType)}
                        disabled={creating || created.includes(key)}
                        size="sm"
                      >
                        {creating ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={createAllUsers}
                disabled={creating}
                className="w-full"
              >
                {creating ? "Creating All..." : "Create All Users"}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Login Credentials:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Hotel 001 Owner:</strong> ownerhotel001@hotel.local / owner12345</p>
                <p><strong>Hotel 001 Admin:</strong> adminhotel001@hotel.local / admin12345</p>
                <p><strong>Hotel 002 Owner:</strong> ownerhotel002@hotel.local / owner12345</p>
                <p><strong>Hotel 002 Admin:</strong> adminhotel002@hotel.local / admin12345</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
