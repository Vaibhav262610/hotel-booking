"use client"

import React, { Suspense } from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useThemePersistence } from "@/hooks/use-theme-persistence"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Bed,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  Users,
  BarChart3,
  Sparkles,
  Settings,
  Menu,
  Bell,
  Search,
  LogOut,
  User,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  LayoutGrid, // added for Non Revenue Report icon
  LogOut as CheckoutIcon,
} from "lucide-react"
import UserMenu from "@/components/user-menu"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Rooms", href: "/rooms", icon: Bed },
  { name: "Bookings", href: "/bookings", icon: Calendar },
  { name: "Reservations", href: "/reservations", icon: CalendarCheck },
  { name: "Checkout", href: "/checkout", icon: CheckoutIcon },
  { name: "Guests", href: "/guests", icon: Users },
  { name: "Housekeeping", href: "/housekeeping", icon: ClipboardCheck },
  { name: "Staff", href: "/staff", icon: Users },
  { name: "Noor AI", href: "/noor-ai", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, toggleTheme, mounted } = useThemePersistence()
  const [masterOpen, setMasterOpen] = useState(true)
  // Added states for reports section
  const [nonRevenueOpen, setNonRevenueOpen] = useState(true)
  const [revenueOpen, setRevenueOpen] = useState(false)

  // Report items with their corresponding URL parameters
  const nonRevenueReports = [
    { name: "Checkin / Checkout Report", type: "checkin-checkout" },
    { name: "Occupancy / Vacant Report", type: "occupancy-vacant" },
    { name: "Expected CheckOut Report", type: "expected-checkout" },
    { name: "Police Report", type: "police-report" },
    { name: "Food Plan Report", type: "food-plan-report" },
    { name: "Arrival Report", type: "arrival-report" },
    { name: "Log Report", type: "log-report" },
    { name: "Complimentary CheckIn Report", type: "complimentary-checkin-report" },
    { name: "Cancelled CheckIn Report", type: "cancelled-checkin-report" },
    { name: "Blocked Rooms Report", type: "blocked-rooms-report" },
    { name: "Rooms Transfers Report", type: "rooms-transfers-report" },
    { name: "Foreigner Report", type: "foreigner-report" },
    { name: "Early Checkin/Late Checkout Report", type: "early-checkin-late-checkout-report" },
  ]

  const revenueReports = [
    { name: "Day Settlement Report", type: "day-settlement" },
    { name: "Occupancy Analysis Report", type: "occupancy-analysis-report" },
    { name: "Sales Day Book Report", type: "sales-day-book-report" },
    { name: "Daily Status Report", type: "daily-status-report" },
    { name: "Sales Report", type: "sales-report" },
    { name: "Roomwise Report", type: "roomwise-report" },
    { name: "Revenue Chart", type: "revenue-chart" },
    { name: "Revenue Wise Report", type: "revenue-wise-report" },
    { name: "Referal Commission Report", type: "referal-commission-report" },
    { name: "High Balance Report", type: "high-balance-report" },
    { name: "Collection Report", type: "collection-report" },
    { name: "Tariff Report", type: "tariff-report" },
    { name: "Meal Plan Cost Report", type: "meal-plan-cost-report" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-bold">Hotel Manager</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          pathname === item.href
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                          "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                  {/* Master dropdown */}
                  <li className="mt-2">
                    <button
                      onClick={() => setMasterOpen((v) => !v)}
                      className={cn(
                        "w-full group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                        "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <User className="h-6 w-6 shrink-0" />
                      Master
                      {masterOpen ? (
                        <ChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </button>
                    {masterOpen && (
                      <ul className="mt-1 ml-9 space-y-1">
                        {[
                          { name: "Request Autopost", href: "/master/request-autopost" },
                          { name: "Guest Master", href: "/master/guests" },
                          { name: "Guest Company Master", href: "/master/guest-companies" },
                          { name: "OTA Master", href: "/master/ota" },
                          { name: "Amenities Master", href: "/master/amenities" },
                          { name: "Blank GRC Form", href: "/master/blank-grc" },
                          { name: "News Paper Master", href: "/master/news-paper" },
                          { name: "Business Source Master", href: "/master/business-source" },
                        ].map((sub) => (
                          <li key={sub.name}>
                            <Link
                              href={sub.href}
                              className={cn(
                                pathname === sub.href
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                "block rounded-md px-2 py-1 text-sm",
                              )}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>

                  {/* Reports section - Non Revenue and Revenue groups */}
                  <li className="mt-4">
                    <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground tracking-wider">
                      REPORTS
                    </div>
                    {/* Non Revenue Report */}
                    <button
                      onClick={() => setNonRevenueOpen((v) => !v)}
                      className={cn(
                        "w-full group mt-1 flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                        "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <LayoutGrid className="h-6 w-6 shrink-0" />
                      Non Revenue Report
                      {nonRevenueOpen ? (
                        <ChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </button>
                    {nonRevenueOpen && (
                      <ul className="mt-1 ml-9 space-y-1">
                        {nonRevenueReports.map((report) => (
                          <li key={report.type}>
                            <Link
                              href={`/reports?type=${report.type}`}
                              className={cn(
                                pathname === "/reports" && searchParams.get('type') === report.type
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                "block rounded-md px-2 py-1 text-sm",
                              )}
                            >
                              {report.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Revenue Report */}
                    <button
                      onClick={() => setRevenueOpen((v) => !v)}
                      className={cn(
                        "w-full group mt-2 flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                        "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <BarChart3 className="h-6 w-6 shrink-0" />
                      Revenue Report
                      {revenueOpen ? (
                        <ChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </button>
                    {revenueOpen && (
                      <ul className="mt-1 ml-9 space-y-1">
                        {revenueReports.map((report) => (
                          <li key={report.type}>
                            <Link
                              href={`/reports?type=${report.type}`}
                              className={cn(
                                pathname === "/reports" && searchParams.get('type') === report.type
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                "block rounded-md px-2 py-1 text-sm",
                              )}
                            >
                              {report.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden fixed top-4 left-4 z-40 bg-transparent">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-bold">Hotel Manager</h1>
          </div>
          <ScrollArea className="flex-1">
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            pathname === item.href
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted",
                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                          )}
                        >
                          <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                    {/* Master dropdown - mobile */}
                    <li className="mt-2">
                      <button
                        onClick={() => setMasterOpen((v) => !v)}
                        className={cn(
                          "w-full group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        <User className="h-6 w-6 shrink-0" />
                        Master
                        {masterOpen ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </button>
                      {masterOpen && (
                        <ul className="mt-1 ml-9 space-y-1">
                          {[
                            { name: "Request Autopost", href: "/master/request-autopost" },
                            { name: "Guest Master", href: "/master/guests" },
                            { name: "Guest Company Master", href: "/master/guest-companies" },
                            { name: "OTA Master", href: "/master/ota" },
                            { name: "Amenities Master", href: "/master/amenities" },
                            { name: "Blank GRC Form", href: "/master/blank-grc" },
                            { name: "News Paper Master", href: "/master/news-paper" },
                            { name: "Business Source Master", href: "/master/business-source" },
                          ].map((sub) => (
                            <li key={sub.name}>
                              <Link
                                href={sub.href}
                                className={cn(
                                  pathname === sub.href
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                  "block rounded-md px-2 py-1 text-sm",
                                )}
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>

                    {/* Reports section - mobile */}
                    <li className="mt-4">
                      <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground tracking-wider">
                        REPORTS
                      </div>
                      {/* Non Revenue Report */}
                      <button
                        onClick={() => setNonRevenueOpen((v) => !v)}
                        className={cn(
                          "w-full group mt-1 flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        <LayoutGrid className="h-6 w-6 shrink-0" />
                        Non Revenue Report
                        {nonRevenueOpen ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </button>
                      {nonRevenueOpen && (
                        <ul className="mt-1 ml-9 space-y-1">
                          {nonRevenueReports.map((report) => (
                            <li key={report.type}>
                              <Link
                                href={`/reports?type=${report.type}`}
                                className={cn(
                                  pathname === "/reports" && searchParams.get('type') === report.type
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                  "block rounded-md px-2 py-1 text-sm",
                                )}
                              >
                                {report.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Revenue Report */}
                      <button
                        onClick={() => setRevenueOpen((v) => !v)}
                        className={cn(
                          "w-full group mt-2 flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        <BarChart3 className="h-6 w-6 shrink-0" />
                        Revenue Report
                        {revenueOpen ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </button>
                      {revenueOpen && (
                        <ul className="mt-1 ml-9 space-y-1">
                          {revenueReports.map((report) => (
                            <li key={report.type}>
                              <Link
                                href={`/reports?type=${report.type}`}
                                className={cn(
                                  pathname === "/reports" && searchParams.get('type') === report.type
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                  "block rounded-md px-2 py-1 text-sm",
                                )}
                              >
                                {report.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  </ul>
                </li>
              </ul>
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 h-5 w-5 text-muted-foreground" />
              <input
                className="block h-full w-full border-0 bg-transparent py-0 pl-10 pr-0 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm"
                placeholder="Search rooms, guests, bookings..."
                type="search"
              />
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Button variant="outline" size="icon" onClick={toggleTheme} disabled={!mounted}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="outline" size="icon" className="relative bg-transparent">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">3</Badge>
              </Button>

              {/** User menu */}
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}
