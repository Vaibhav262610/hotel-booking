"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Clock, LogOut } from "lucide-react"
import { formatTimeUntilExpiry, SESSION_CONFIG } from "@/lib/auth-utils"

export function SessionWarning() {
  const { data: session, update } = useSession()
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (!session?.expires) return

    const checkExpiry = () => {
      const now = new Date()
      const expiry = new Date(session.expires)
      const timeLeft = expiry.getTime() - now.getTime()
      
      setTimeUntilExpiry(timeLeft)
      
      // Show warning if less than 15 minutes left
      if (timeLeft <= SESSION_CONFIG.WARNING_MINUTES * 60 * 1000) {
        setShowWarning(true)
      } else {
        setShowWarning(false)
      }
    }

    // Check immediately
    checkExpiry()

    // Check every minute
    const interval = setInterval(checkExpiry, 60000)

    return () => clearInterval(interval)
  }, [session?.expires])

  const handleExtendSession = async () => {
    try {
      await update() // This will refresh the session
      setShowWarning(false)
    } catch (error) {
      console.error('Failed to extend session:', error)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  if (!showWarning || !timeUntilExpiry) {
    return null
  }

  const isExpired = timeUntilExpiry <= 0
  const isCritical = timeUntilExpiry <= SESSION_CONFIG.BUFFER_MINUTES * 60 * 1000

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className={isCritical ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}>
        <Clock className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            {isExpired ? (
              <span className="font-medium">Session expired</span>
            ) : (
              <span className="font-medium">
                Session expires in {formatTimeUntilExpiry(timeUntilExpiry)}
              </span>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {isExpired 
                ? "Please log in again to continue" 
                : "Extend your session or save your work"
              }
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            {!isExpired && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleExtendSession}
              >
                Extend
              </Button>
            )}
            <Button 
              size="sm" 
              variant={isCritical ? "destructive" : "outline"}
              onClick={handleLogout}
            >
              <LogOut className="h-3 w-3 mr-1" />
              Logout
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

