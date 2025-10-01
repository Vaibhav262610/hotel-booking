import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function useThemePersistence() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure theme is only accessed after component mounts to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize theme from localStorage on mount
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('hms-theme-preference')
      if (savedTheme && savedTheme !== theme) {
        setTheme(savedTheme)
      }
    }
  }, [mounted, theme, setTheme])

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    
    // Store theme preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('hms-theme-preference', newTheme)
    }
  }

  const setPersistentTheme = (newTheme: string) => {
    setTheme(newTheme)
    
    // Store theme preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('hms-theme-preference', newTheme)
    }
  }

  return {
    theme: mounted ? theme : 'light',
    resolvedTheme: mounted ? resolvedTheme : 'light',
    setTheme: setPersistentTheme,
    toggleTheme,
    mounted
  }
}
