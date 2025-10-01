import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import AuthSessionProvider from "@/components/auth-session-provider"
import { ThemeContextProvider } from "@/components/theme-context"
import { HotelProvider } from "@/lib/hotel-context"
import { Toaster } from "@/components/ui/toaster"
import { SessionWarning } from "@/components/session-warning"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Hotel Management System",
  description: "Complete hotel management solution",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthSessionProvider>
          <HotelProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
              <ThemeContextProvider>
                {children}
                <SessionWarning />
                <Toaster />
              </ThemeContextProvider>
            </ThemeProvider>
          </HotelProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
