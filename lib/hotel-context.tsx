"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getHotelDatabase } from '@/lib/hotel-database'

interface HotelContextType {
  hotelId: string | null
  hotelName: string | null
  client: any | null
  adminClient: any | null
  isLoading: boolean
  error: string | null
}

const HotelContext = createContext<HotelContextType>({
  hotelId: null,
  hotelName: null,
  client: null,
  adminClient: null,
  isLoading: true,
  error: null
})

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [hotelName, setHotelName] = useState<string | null>(null)
  const [client, setClient] = useState<any>(null)
  const [adminClient, setAdminClient] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeHotel = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get hotel ID from session
        let currentHotelId = (session?.user as any)?.hotelId
        
        if (!currentHotelId) {
          // Try to get from localStorage
          const storedHotel = localStorage.getItem('selectedHotel')
          if (storedHotel) {
            const hotel = JSON.parse(storedHotel)
            currentHotelId = hotel.hotelId
            setHotelName(hotel.name)
          }
        }

        if (!currentHotelId) {
          setError('No hotel selected')
          setIsLoading(false)
          return
        }

        setHotelId(currentHotelId)

        // Get hotel-specific database clients
        const { client: hotelClient, adminClient: hotelAdminClient } = getHotelDatabase(currentHotelId)
        
        setClient(hotelClient)
        setAdminClient(hotelAdminClient)

        // Store hotel info in localStorage for persistence
        if (!hotelName) {
          setHotelName(`Hotel ${currentHotelId.replace('hotel', '')}`)
        }

        localStorage.setItem('selectedHotel', JSON.stringify({
          hotelId: currentHotelId,
          name: hotelName || `Hotel ${currentHotelId.replace('hotel', '')}`
        }))

      } catch (err: any) {
        console.error('Error initializing hotel:', err)
        setError(err.message || 'Failed to initialize hotel database')
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'loading') {
      return // Still loading session
    }

    initializeHotel()
  }, [session, status, hotelName])

  const value: HotelContextType = {
    hotelId,
    hotelName,
    client,
    adminClient,
    isLoading,
    error
  }

  return (
    <HotelContext.Provider value={value}>
      {children}
    </HotelContext.Provider>
  )
}

export function useHotel() {
  const context = useContext(HotelContext)
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider')
  }
  return context
}

// Hook to get hotel-specific database client
export function useHotelClient() {
  const { client, isLoading, error } = useHotel()
  
  if (isLoading) {
    throw new Error('Hotel client is still loading')
  }
  
  if (error) {
    throw new Error(`Hotel client error: ${error}`)
  }
  
  if (!client) {
    throw new Error('No hotel client available')
  }
  
  return client
}

// Hook to get hotel-specific admin client
export function useHotelAdminClient() {
  const { adminClient, isLoading, error } = useHotel()
  
  if (isLoading) {
    throw new Error('Hotel admin client is still loading')
  }
  
  if (error) {
    throw new Error(`Hotel admin client error: ${error}`)
  }
  
  if (!adminClient) {
    throw new Error('No hotel admin client available')
  }
  
  return adminClient
}
