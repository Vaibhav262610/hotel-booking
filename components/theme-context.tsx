'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

interface ThemeContextType {
  currentTheme: string
  setCurrentTheme: (theme: string) => void
  isThemeStable: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const [currentTheme, setCurrentTheme] = useState('light')
  const [isThemeStable, setIsThemeStable] = useState(false)

  // Initialize theme from localStorage and prevent changes during form submissions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('hms-theme-preference')
      if (savedTheme) {
        setCurrentTheme(savedTheme)
        setTheme(savedTheme)
      } else {
        setCurrentTheme('light')
        setTheme('light')
      }
      setIsThemeStable(true)
    }
  }, [setTheme])

  // Prevent theme from changing unexpectedly
  useEffect(() => {
    if (isThemeStable && theme && theme !== currentTheme) {
      // Only allow theme changes if they're explicitly requested
      const savedTheme = localStorage.getItem('hms-theme-preference')
      if (savedTheme && savedTheme === theme) {
        setCurrentTheme(theme)
      } else {
        // Revert to the stable theme
        setTheme(currentTheme)
      }
    }
  }, [theme, currentTheme, isThemeStable, setTheme])

  const handleSetTheme = (newTheme: string) => {
    setCurrentTheme(newTheme)
    setTheme(newTheme)
    localStorage.setItem('hms-theme-preference', newTheme)
  }

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setCurrentTheme: handleSetTheme,
      isThemeStable
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider')
  }
  return context
}
