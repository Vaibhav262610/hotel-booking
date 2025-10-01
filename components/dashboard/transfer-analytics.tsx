"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download
} from "lucide-react";
import { DateRangePicker } from "../reports/shared/date-range-picker";
import { format } from "date-fns";
import { RoomTransferService } from "@/lib/room-transfer-service";
import { TransferNotificationService } from "@/lib/transfer-notification-service";
import { useToast } from "@/hooks/use-toast";

interface TransferAnalytics {
  totalTransfers: number
  transfersByReason: Record<string, number>
  transfers: any[]
}

interface NotificationStats {
  total: number
  sent: number
  failed: number
  pending: number
  byType: Record<string, number>
}

export function TransferAnalytics() {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [transferStats, setTransferStats] = useState<TransferAnalytics | null>(null);
  const [notificationStats, setNotificationStats] = useState<NotificationStats | null>(null);

  const loadAnalytics = async () => {
    if (!fromDate || !toDate) return;
    
    setLoading(true);
    try {
      const [transfers, notifications] = await Promise.all([
        RoomTransferService.getTransferStatistics(fromDate, toDate),
        TransferNotificationService.getNotificationStatistics(fromDate, toDate)
      ]);

      setTransferStats(transfers);
      setNotificationStats(notifications);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load transfer analytics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [fromDate, toDate]);

  const getTopReasons = () => {
    if (!transferStats?.transfersByReason) return [];
    
    return Object.entries(transferStats.transfersByReason)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const getReasonColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transfer Analytics</h2>
          <p className="text-muted-foreground">Room transfer insights and statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <Button onClick={loadAnalytics} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
                <p className="text-3xl font-bold">{transferStats?.totalTransfers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Guest Requests</p>
                <p className="text-3xl font-bold">
                  {transferStats?.transfersByReason['Guest request'] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-3xl font-bold">
                  {transferStats?.transfersByReason['Room maintenance required'] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold">
                  {notificationStats ? 
                    Math.round((notificationStats.sent / notificationStats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Reasons Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Transfer Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTopReasons().map(([reason, count], index) => (
                <div key={reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getReasonColor(index)}`} />
                    <span className="text-sm font-medium">{reason}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count}</span>
                    <Badge variant="outline" className="text-xs">
                      {transferStats ? 
                        Math.round((count / transferStats.totalTransfers) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notification Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Notification Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Notifications</span>
                <Badge variant="outline">{notificationStats?.total || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Successfully Sent</span>
                <Badge variant="default" className="bg-green-500">
                  {notificationStats?.sent || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Failed</span>
                <Badge variant="destructive">
                  {notificationStats?.failed || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending</span>
                <Badge variant="secondary">
                  {notificationStats?.pending || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers */}
      {transferStats?.transfers && transferStats.transfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transferStats.transfers.slice(0, 10).map((transfer, index) => (
                <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">
                        {transfer.from_room.number} → {transfer.to_room.number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.reason} • {format(new Date(transfer.transfer_date), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(transfer.transfer_date), "HH:mm")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
