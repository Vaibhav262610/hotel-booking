import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardStats } from "./types"

interface TodaysSummaryProps {
  stats: DashboardStats
}

export function TodaysSummary({ stats }: TodaysSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm">Arrivals</span>
          <Badge variant="secondary">{stats.checkInsToday}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Departures</span>
          <Badge variant="secondary">8</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Maintenance</span>
          <Badge variant="destructive">2</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Available</span>
          <Badge variant="default">{stats.availableRooms}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
