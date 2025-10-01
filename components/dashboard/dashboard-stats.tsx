import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Bed, ClipboardCheck, UserCheck } from "lucide-react"
import { DashboardStats, DashboardStatCard } from "./types"

interface DashboardStatsProps {
  stats: DashboardStats
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const dashboardStats: DashboardStatCard[] = [
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      change: "+12.5%",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Occupied Rooms",
      value: `${stats.occupiedRooms}/${stats.totalRooms}`,
      change: `${stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%`,
      icon: Bed,
      color: "text-blue-600",
    },
    {
      title: "Check-ins Today",
      value: stats.checkInsToday.toString(),
      change: "+3 from yesterday",
      icon: UserCheck,
      color: "text-purple-600",
    },
    {
      title: "Pending Housekeeping",
      value: stats.pendingHousekeeping.toString(),
      change: "2 in progress",
      icon: ClipboardCheck,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {dashboardStats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
