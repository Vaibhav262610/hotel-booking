"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RoomStatusGrid } from "@/components/room-status-grid";
import { RecentBookings } from "@/components/recent-bookings";
import { OccupancyChart } from "@/components/occupancy-chart";
import { RevenueChart } from "@/components/revenue-chart";
import { FloorWiseRoomStatus } from "@/components/floor-wise-room-status";
import {
  useDashboardData,
  DashboardHeader,
  DashboardStats,
  QuickActions,
  TodaysSummary,
} from "@/components/dashboard";

export default function Dashboard() {
  const [currentDate] = useState(new Date().toLocaleDateString());
  const { stats, rooms, staff, bookings, loading, error, refetch } =
    useDashboardData();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-lg text-muted-foreground">
            Loading dashboard...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-lg text-red-600">{error}</div>
          <Button onClick={refetch} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <DashboardHeader
          currentDate={currentDate}
          rooms={rooms}
          staff={staff}
          onRefresh={refetch}
        />

        {/* Stats Cards */}
        <DashboardStats stats={stats} />

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Floor-wise Room Status</CardTitle>
            <CardDescription>
              Manage room status and availability by floor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FloorWiseRoomStatus />
          </CardContent>
        </Card>

        {/* Charts and Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Last 7 days revenue comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Occupancy Rate</CardTitle>
              <CardDescription>Room occupancy over time</CardDescription>
            </CardHeader>
            <CardContent>
              <OccupancyChart />
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
              Latest booking activities and status updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentBookings />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
