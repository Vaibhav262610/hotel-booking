"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [hotelId, setHotelId] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: "Email and password required", variant: "destructive" })
      return
    }
    if (!hotelId) {
      toast({ title: "Hotel ID required", description: "Please select hotel_001 or hotel_002", variant: "destructive" })
      return
    }
    
    setLoading(true)
    try {
      const result = await signIn("credentials", { 
        email, 
        password, 
        hotelId,
        redirect: false 
      })
      if (!result || result.error) {
        throw new Error(result?.error || "Login failed")
      }
      
      // Store hotel context
      localStorage.setItem('selectedHotel', JSON.stringify({
        hotelId,
        name: `Hotel ${hotelId.replace('hotel', '')}`
      }))
      
      router.replace("/")
    } catch (err: any) {
      toast({ title: "Login error", description: err.message, variant: "destructive" })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hotel Management Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hotelId">Hotel ID</Label>
              <Input
                id="hotelId"
                type="text"
                placeholder="hotel_001 or hotel_002"
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">Enter hotel_001 or hotel_002</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}