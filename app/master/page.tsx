"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function MasterIndexPage() {
  const items = [
    { name: "Request Autopost", href: "/master/request-autopost" },
    { name: "Guest Master", href: "/master/guests" },
    { name: "Guest Company Master", href: "/master/guest-companies" },
    { name: "OTA Master", href: "/master/ota" },
    { name: "Amenities Master", href: "/master/amenities" },
    { name: "Blank GRC Form", href: "/master/blank-grc" },
    { name: "News Paper Master", href: "/master/news-paper" },
    { name: "Business Source Master", href: "/master/business-source" },
  ]

  return (
    <DashboardLayout>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
        <Card key={i.name} className="hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle>{i.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={i.href}>Open</Link>
            </Button>
          </CardContent>        </Card>
      ))}
      </div>
    </DashboardLayout>
  )
}


