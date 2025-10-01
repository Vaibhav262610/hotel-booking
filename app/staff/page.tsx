"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Eye, Shield, Clock, Activity, Mail, UserPlus, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { staffService, staffLogService, Staff, supabase } from "@/lib/supabase"
// import { emailService } from "@/lib/email-service"
import { format } from "date-fns"

interface StaffFormData {
  name: string
  email: string
  phone: string
  role: string
  department: string
  permissions: string[]
  notes?: string
}

interface StaffStats {
  total: number
  active: number
  admins: number
  online: number
}

const roleConfig = {
  Owner: {
    variant: "default" as const,
    label: "Owner",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  Admin: {
    variant: "secondary" as const,
    label: "Admin",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  "Front Office Staff": {
    variant: "outline" as const,
    label: "Front Office",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  "Housekeeping Manager": {
    variant: "outline" as const,
    label: "Housekeeping",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  "Housekeeping Staff": {
    variant: "outline" as const,
    label: "Housekeeping",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
}

const statusConfig = {
  active: { variant: "default" as const, label: "Active" },
  inactive: { variant: "secondary" as const, label: "Inactive" },
}

const permissionOptions = [
  { id: "bookings", label: "Manage Bookings" },
  { id: "checkin", label: "Check-in/Check-out" },
  { id: "rooms", label: "Room Management" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "reports", label: "View Reports" },
  { id: "staff", label: "Staff Management" },
  { id: "settings", label: "System Settings" },
  { id: "all", label: "All Permissions" },
]

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffLogs, setStaffLogs] = useState<any[]>([])
  const [stats, setStats] = useState<StaffStats>({
    total: 0,
    active: 0,
    admins: 0,
    online: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState<StaffFormData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    permissions: [],
    notes: "",
  })
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [showPassword, setShowPassword] = useState<string | null>(null)
  const [staffTempPasswords, setStaffTempPasswords] = useState<Record<string, string>>({})

  const { toast } = useToast()

  // Fetch staff data
  const fetchStaffData = async () => {
    try {
      setLoading(true)
      const [staffData, logsData] = await Promise.all([
        staffService.getStaff(),
        staffLogService.getLogs()
      ])

      const staff = staffData || []
      const logs = logsData || []

      setStaff(staff)
      setStaffLogs(logs)

      // Calculate stats
      setStats({
        total: staff.length,
        active: staff.filter(s => s.status === "active").length,
        admins: staff.filter(s => s.role === "Admin").length,
        online: staff.filter(s => {
          if (!s.last_login) return false
          const lastLogin = new Date(s.last_login)
          const now = new Date()
          return (now.getTime() - lastLogin.getTime()) < 30 * 60 * 1000 // 30 minutes
        }).length,
      })
    } catch (error) {
      console.error("Error fetching staff data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch staff data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffData()
  }, [])

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || member.role === filterRole
    const matchesStatus = filterStatus === "all" || member.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  // Generate temporary password
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  // Email disabled: we will show the generated password in UI instead

  // Create staff member
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const password = generatePassword()
      
      // Create staff via API to ensure auth user + staff profile
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          department: formData.department,
          permissions: formData.permissions,
          password
        })
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to create staff')
      const newStaff = payload.staff
      const returnedPassword = payload.password

      // Show password inline (email disabled)
      setShowPassword(password)

      // Store password for viewing in Staff Details (in-memory only)
      if (newStaff?.id && returnedPassword) {
        setStaffTempPasswords(prev => ({ ...prev, [newStaff.id]: returnedPassword }))
      }

      // Log the action after successful creation (with delay to ensure DB commit)
      try {
        // Small delay to ensure the staff record is fully committed
        await new Promise(resolve => setTimeout(resolve, 100))
        await staffLogService.logStaffAction(newStaff.id, "Created new staff member", `Created staff member: ${formData.name} (${formData.email})`)
      } catch (logError) {
        console.warn("Failed to log staff action:", logError)
        // Don't fail the entire operation if logging fails
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
        department: "",
        permissions: [],
        notes: "",
      })
      setIsAddDialogOpen(false)

      // Refresh data
      await fetchStaffData()

      toast({
        title: "Success",
        description: "Staff member created successfully",
      })
    } catch (error) {
      console.error("Error creating staff:", error)
      toast({
        title: "Error",
        description: "Failed to create staff member",
        variant: "destructive",
      })
    }
  }

  // Update staff member
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStaff) return

    try {
      const { error } = await supabase
        .from("staff")
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          department: formData.department,
          permissions: formData.permissions,
        })
        .eq("id", selectedStaff.id)

      if (error) throw error

      // Log the action after successful update
      try {
        await staffLogService.logStaffAction(selectedStaff.id, "Updated staff member", `Updated staff member: ${formData.name} (${formData.email})`)
      } catch (logError) {
        console.warn("Failed to log staff action:", logError)
        // Don't fail the entire operation if logging fails
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
        department: "",
        permissions: [],
        notes: "",
      })
      setSelectedStaff(null)
      setIsEditDialogOpen(false)

      // Refresh data
      await fetchStaffData()

      toast({
        title: "Success",
        description: "Staff member updated successfully",
      })
    } catch (error) {
      console.error("Error updating staff:", error)
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      })
    }
  }

  // Delete staff member
  const handleDeleteStaff = async () => {
    if (!selectedStaff) return

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", selectedStaff.id)

      if (error) throw error

      // Log the action after successful deletion
      try {
        await staffLogService.logStaffAction(selectedStaff.id, "Deleted staff member", `Deleted staff member: ${selectedStaff.name} (${selectedStaff.email})`)
      } catch (logError) {
        console.warn("Failed to log staff action:", logError)
        // Don't fail the entire operation if logging fails
      }

      setSelectedStaff(null)
      setIsDeleteDialogOpen(false)

      // Refresh data
      await fetchStaffData()

      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting staff:", error)
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      })
    }
  }

  // Toggle staff status
  const handleToggleStatus = async (staffId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active"
      
      const { error } = await supabase
        .from("staff")
        .update({ status: newStatus })
        .eq("id", staffId)

      if (error) throw error

      // Log the action after successful status change
      try {
        await staffLogService.logStaffAction(staffId, `Changed staff status to ${newStatus}`, `Staff status changed to ${newStatus}`)
      } catch (logError) {
        console.warn("Failed to log staff action:", logError)
        // Don't fail the entire operation if logging fails
      }

      // Refresh data
      await fetchStaffData()

      toast({
        title: "Success",
        description: `Staff status updated to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating staff status:", error)
      toast({
        title: "Error",
        description: "Failed to update staff status",
        variant: "destructive",
      })
    }
  }

  // Handle permission toggle
  const handlePermissionToggle = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }))
  }

  // Open edit dialog
  const openEditDialog = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone || "",
      role: staffMember.role,
      department: staffMember.department || "",
      permissions: staffMember.permissions || [],
      notes: "",
    })
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setIsDeleteDialogOpen(true)
  }

  // Open view dialog
  const openViewDialog = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setIsViewDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground">Manage hotel staff, roles, and permissions</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new staff account. An invitation email will be sent with login credentials.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateStaff}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="staff-name">Full Name *</Label>
                      <Input
                        id="staff-name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-email">Email *</Label>
                      <Input
                        id="staff-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@hotel.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="staff-phone">Phone</Label>
                      <Input
                        id="staff-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-role">Role *</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Front Office Staff">Front Office Staff</SelectItem>
                          <SelectItem value="Housekeeping Manager">Housekeeping Manager</SelectItem>
                          <SelectItem value="Housekeeping Staff">Housekeeping Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-department">Department</Label>
                    <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Management">Management</SelectItem>
                        <SelectItem value="Front Office">Front Office</SelectItem>
                        <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {permissionOptions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Switch
                            id={`perm-${permission.id}`}
                            checked={formData.permissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          <Label htmlFor={`perm-${permission.id}`} className="text-sm">
                            {permission.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-notes">Notes</Label>
                    <Textarea
                      id="staff-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Staff Member
                  </Button>
                </DialogFooter>
              </form>
              {showPassword && (
                <div className="mt-4 p-3 rounded border bg-yellow-50 text-yellow-900">
                  <div className="font-medium">Temporary password generated:</div>
                  <div className="font-mono text-lg">{showPassword}</div>
                  <div className="text-sm mt-1">Share this with the staff member. They should change it after first login.</div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Total Staff</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Active Staff</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Admins</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Online Now</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.online}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Staff Management</CardTitle>
            <CardDescription>Manage staff members, roles, and activity logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="staff-list" className="space-y-4">
              <TabsList>
                <TabsTrigger value="staff-list">Staff List</TabsTrigger>
                <TabsTrigger value="activity-logs">Activity Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="staff-list">
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search staff by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Front Office Staff">Front Office</SelectItem>
                        <SelectItem value="Housekeeping Manager">Housekeeping</SelectItem>
                        <SelectItem value="Housekeeping Staff">Housekeeping Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Staff Table */}
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading staff data...</div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-foreground">Staff Member</TableHead>
                          <TableHead className="text-foreground">Role</TableHead>
                          <TableHead className="text-foreground">Department</TableHead>
                          <TableHead className="text-foreground">Status</TableHead>
                          <TableHead className="text-foreground">Join Date</TableHead>
                          <TableHead className="text-foreground">Last Login</TableHead>
                          <TableHead className="text-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStaff.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No staff members found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStaff.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src="/placeholder.svg" />
                                    <AvatarFallback className="bg-muted text-foreground">
                                      {member.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-foreground">{member.name}</div>
                                    <div className="text-sm text-muted-foreground">{member.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={roleConfig[member.role as keyof typeof roleConfig]?.color || "bg-gray-100 text-gray-800"}>
                                  {roleConfig[member.role as keyof typeof roleConfig]?.label || member.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground">{member.department || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={statusConfig[member.status as keyof typeof statusConfig]?.variant || "secondary"}>
                                  {statusConfig[member.status as keyof typeof statusConfig]?.label || member.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {member.join_date ? format(new Date(member.join_date), "MMM dd, yyyy") : "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {member.last_login ? format(new Date(member.last_login), "MMM dd, yyyy HH:mm") : "Never"}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openViewDialog(member)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleToggleStatus(member.id, member.status)}
                                  >
                                    {member.status === "active" ? "🚫" : "✅"}
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(member)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity-logs">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Staff Activity Logs</h3>
                      <p className="text-sm text-muted-foreground">Track all staff actions and system interactions</p>
                    </div>
                    <Button variant="outline">
                      <Activity className="w-4 h-4 mr-2" />
                      Export Logs
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-foreground">Staff Member</TableHead>
                        <TableHead className="text-foreground">Action</TableHead>
                        <TableHead className="text-foreground">Details</TableHead>
                        <TableHead className="text-foreground">Timestamp</TableHead>
                        <TableHead className="text-foreground">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No activity logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        staffLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium text-foreground">
                              {log.staff?.name || "System"}
                            </TableCell>
                            <TableCell className="text-foreground">{log.action}</TableCell>
                            <TableCell className="text-muted-foreground">{log.details}</TableCell>
                            <TableCell className="text-foreground">
                              {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{log.ip_address || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>Update staff member information and permissions.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateStaff}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-staff-name">Full Name *</Label>
                    <Input
                      id="edit-staff-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-staff-email">Email *</Label>
                    <Input
                      id="edit-staff-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@hotel.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-staff-phone">Phone</Label>
                    <Input
                      id="edit-staff-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-staff-role">Role *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Front Office Staff">Front Office Staff</SelectItem>
                        <SelectItem value="Housekeeping Manager">Housekeeping Manager</SelectItem>
                        <SelectItem value="Housekeeping Staff">Housekeeping Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-department">Department</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Front Office">Front Office</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {permissionOptions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Switch
                          id={`edit-perm-${permission.id}`}
                          checked={formData.permissions.includes(permission.id)}
                          onCheckedChange={() => handlePermissionToggle(permission.id)}
                        />
                        <Label htmlFor={`edit-perm-${permission.id}`} className="text-sm">
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Staff Member</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Staff Member Details</DialogTitle>
              <DialogDescription>View detailed information about the staff member.</DialogDescription>
            </DialogHeader>
            {selectedStaff && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-muted text-foreground text-lg">
                      {selectedStaff.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedStaff.name}</h3>
                    <p className="text-muted-foreground">{selectedStaff.email}</p>
                    <Badge className={roleConfig[selectedStaff.role as keyof typeof roleConfig]?.color || "bg-gray-100 text-gray-800"}>
                      {roleConfig[selectedStaff.role as keyof typeof roleConfig]?.label || selectedStaff.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Temporary Password</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground">
                      {staffTempPasswords[selectedStaff.id] || "Not available"}
                    </span>
                    {staffTempPasswords[selectedStaff.id] ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(staffTempPasswords[selectedStaff.id])
                            toast({ title: "Copied", description: "Password copied to clipboard" })
                          } catch (e) {
                            toast({ title: "Copy failed", description: "Could not copy password", variant: "destructive" })
                          }
                        }}
                      >
                        Copy
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Shown only if this admin created the account in this session.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{selectedStaff.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Department</Label>
                    <p className="text-sm text-muted-foreground">{selectedStaff.department || "Not assigned"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={statusConfig[selectedStaff.status as keyof typeof statusConfig]?.variant || "secondary"}>
                      {statusConfig[selectedStaff.status as keyof typeof statusConfig]?.label || selectedStaff.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Join Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedStaff.join_date ? format(new Date(selectedStaff.join_date), "MMM dd, yyyy") : "Not available"}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Permissions</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedStaff.permissions || []).length === 0 ? (
                      <span className="text-sm text-muted-foreground">No permissions assigned</span>
                    ) : (
                      (selectedStaff.permissions || []).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permissionOptions.find(p => p.id === permission)?.label || permission}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Login</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedStaff.last_login ? format(new Date(selectedStaff.last_login), "MMM dd, yyyy HH:mm") : "Never logged in"}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Delete Staff Member
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedStaff?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteStaff}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
