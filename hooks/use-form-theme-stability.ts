import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

export function useFormThemeStability() {
  const { theme, setTheme } = useTheme()
  const stableThemeRef = useRef<string>('light')
  const isSubmittingRef = useRef(false)

  // Store the current theme when the hook is initialized
  useEffect(() => {
    if (theme) {
      stableThemeRef.current = theme
    }
  }, [theme])

  // Prevent theme changes during form submission
  useEffect(() => {
    if (isSubmittingRef.current && theme !== stableThemeRef.current) {
      // Revert to the stable theme if it changed during submission
      setTheme(stableThemeRef.current)
    }
  }, [theme, setTheme])

  const startSubmission = () => {
    isSubmittingRef.current = true
    stableThemeRef.current = theme || 'light'
  }

  const endSubmission = () => {
    isSubmittingRef.current = false
  }

  return {
    startSubmission,
    endSubmission,
    currentTheme: theme,
    stableTheme: stableThemeRef.current
  }
}
