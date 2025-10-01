"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Activity, Search, Filter, Download, RefreshCw, Calendar, User, Clock } from "lucide-react"

interface StaffLog {
  id: string
  hotel_id: string
  staff_id: string
  action: string
  details: string
  ip_address: string
  created_at: string
  staff?: {
    name: string
    role: string
  }
}

export default function StaffLogsPage() {
  const [logs, setLogs] = useState<StaffLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<StaffLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterStaff, setFilterStaff] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [stats, setStats] = useState({
    totalLogs: 0,
    todayLogs: 0,
    thisWeekLogs: 0,
    thisMonthLogs: 0
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchLogs()
    fetchStaff()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, filterAction, filterStaff, dateRange])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("staff_logs")
        .select(`
          *,
          staff:staff_id(name, role)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setLogs(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error("Error fetching logs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch staff logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, role")
        .order("name")

      if (error) throw error
      setStaffMembers(data || [])
    } catch (error) {
      console.error("Error fetching staff:", error)
    }
  }

  const calculateStats = (logsData: StaffLog[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())

    setStats({
      totalLogs: logsData.length,
      todayLogs: logsData.filter(log => new Date(log.created_at) >= today).length,
      thisWeekLogs: logsData.filter(log => new Date(log.created_at) >= weekAgo).length,
      thisMonthLogs: logsData.filter(log => new Date(log.created_at) >= monthAgo).length
    })
  }

  const filterLogs = () => {
    let filtered = [...logs]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.staff?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Action filter
    if (filterAction !== "all") {
      filtered = filtered.filter(log => log.action === filterAction)
    }

    // Staff filter
    if (filterStaff !== "all") {
      filtered = filtered.filter(log => log.staff_id === filterStaff)
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (dateRange) {
        case "today":
          filtered = filtered.filter(log => new Date(log.created_at) >= today)
          break
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          filtered = filtered.filter(log => new Date(log.created_at) >= weekAgo)
          break
        case "month":
          const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
          filtered = filtered.filter(log => new Date(log.created_at) >= monthAgo)
          break
      }
    }

    setFilteredLogs(filtered)
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE_BOOKING":
        return "bg-green-100 text-green-800"
      case "UPDATE_BOOKING":
        return "bg-blue-100 text-blue-800"
      case "DELETE_BOOKING":
        return "bg-red-100 text-red-800"
      case "CHECK_IN":
        return "bg-emerald-100 text-emerald-800"
      case "CHECK_OUT":
        return "bg-orange-100 text-orange-800"
      case "CREATE_STAFF":
        return "bg-purple-100 text-purple-800"
      case "UPDATE_STAFF":
        return "bg-indigo-100 text-indigo-800"
      case "DELETE_STAFF":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const exportLogs = () => {
    const csvContent = [
      ["Date", "Time", "Staff", "Action", "Details", "IP Address"],
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), "yyyy-MM-dd"),
        format(new Date(log.created_at), "HH:mm:ss"),
        log.staff?.name || "Unknown",
        log.action,
        log.details,
        log.ip_address || "N/A"
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `staff-logs-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Staff logs exported successfully",
    })
  }

  const getUniqueActions = () => {
    const actions = [...new Set(logs.map(log => log.action))]
    return actions.sort()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Activity Logs</h1>
          <p className="text-muted-foreground">
            Monitor all staff activities and system actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todayLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.thisWeekLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.thisMonthLogs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-filter">Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {getUniqueActions().map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-filter">Staff Member</Label>
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} - {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-filter">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Activity Logs ({filteredLogs.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs found matching your criteria
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {format(new Date(log.created_at), "MMM dd, yyyy")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {log.staff?.name || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.staff?.role || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm">
                          {log.details}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {log.ip_address || "N/A"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 