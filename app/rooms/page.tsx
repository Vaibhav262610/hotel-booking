"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useFormThemeStability } from "@/hooks/use-form-theme-stability"
import { roomService, housekeepingService, staffService, roomTypeService, supabase, type Room as DbRoom, type HousekeepingTask as DbHousekeepingTask, type Staff as DbStaff, type RoomType } from "@/lib/supabase"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Ban,
  Sparkles,
  Users,
  Calendar,
  FileText,
  Settings,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronDown,
  BarChart3,
  Map
} from "lucide-react"
import { FloorWiseRoomStatus } from "@/components/floor-wise-room-status"

type UIRoom = Omit<DbRoom, "status" | "type"> & { status: string; type?: string }
type UIHousekeepingTask = DbHousekeepingTask
type UIStaff = DbStaff

export default function RoomsPage() {
  const { startSubmission, endSubmission } = useFormThemeStability()
  const [rooms, setRooms] = useState<UIRoom[]>([])
  const [filteredRooms, setFilteredRooms] = useState<UIRoom[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"number" | "price" | "floor" | "status">("number")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isHousekeepingDialogOpen, setIsHousekeepingDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<UIRoom | null>(null)
  const [housekeepingTasks, setHousekeepingTasks] = useState<UIHousekeepingTask[]>([])
  const [staff, setStaff] = useState<UIStaff[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [activeTab, setActiveTab] = useState("grid")
  const [activeTaskView, setActiveTaskView] = useState<'grid' | 'list'>('grid')

  const [formData, setFormData] = useState({
    number: "",
    roomTypeId: "",
    price: null as number | null,
    totalBeds: 0,
    maxPax: 1,
    floor: 1,
    amenities: ""
  })
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])

  const [statusFormData, setStatusFormData] = useState({
    newStatus: "",
    reason: "",
    assignedStaffId: ""
  })

  const [taskFormData, setTaskFormData] = useState({
    type: "",
    priority: "medium",
    estimatedTime: 45,
    notes: "",
    assignedTo: ""
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchRooms()
    fetchRoomTypes()
    fetchHousekeepingTasks()
    fetchStaff()

    // Test database connection
    testDatabaseConnection()
  }, [])

  const testDatabaseConnection = async () => {
    try {
      console.log("Testing database connection...")

      // First, try to get table info
      const { data: tableInfo, error: tableError } = await supabase
        .from("housekeeping_tasks")
        .select("*")
        .limit(0) // This will return column info without data

      if (tableError) {
        console.error("Table structure check failed:", tableError)
        if (tableError.code === 'PGRST116') {
          console.error("Table 'housekeeping_tasks' does not exist")
        } else {
          console.error("Other table error:", tableError)
        }
        return
      }

      // Try to get actual data
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .select("id")
        .limit(1)

      if (error) {
        console.error("Data fetch test failed:", error)
        console.error("This suggests the table exists but has different column names")
      } else {
        console.log("Database connection test successful")
        console.log("Table structure appears to be correct")
      }

      // Log table structure info
      console.log("Table structure check completed")

      // Try to inspect table columns by attempting different selects
      console.log("Inspecting table columns...")

      try {
        // Test common column names with detailed error logging
        const testColumns = [
          'id', 'task_number', 'hotel_id', 'room_id', 'assigned_to',
          'type', 'status', 'priority', 'estimated_time', 'notes',
          'scheduled_date', 'created_at', 'updated_at'
        ]

        console.log("=== COLUMN INSPECTION RESULTS ===")

        for (const column of testColumns) {
          try {
            console.log(`Testing column: ${column}`)
            const { error: colError } = await supabase
              .from("housekeeping_tasks")
              .select(column)
              .limit(0)

            if (colError) {
              console.log(`❌ Column '${column}' - NOT FOUND`)
              console.log(`   Error details:`, colError)
              console.log(`   Error code:`, colError.code)
              console.log(`   Error message:`, colError.message)
            } else {
              console.log(`✅ Column '${column}' - EXISTS`)
            }
          } catch (colError) {
            console.log(`❌ Column '${column}' - ERROR:`, colError)
            console.log(`   Error type:`, typeof colError)
            console.log(`   Error constructor:`, colError?.constructor?.name)
          }
          console.log("---")
        }

        // Also try to get a sample row to see the actual structure
        console.log("=== ATTEMPTING SAMPLE DATA FETCH ===")
        try {
          const { data: sampleData, error: sampleError } = await supabase
            .from("housekeeping_tasks")
            .select("*")
            .limit(1)

          if (sampleError) {
            console.log("❌ Sample data fetch failed:", sampleError)
          } else {
            console.log("✅ Sample data fetch successful")
            console.log("Sample data structure:", sampleData)
            if (sampleData && sampleData.length > 0) {
              console.log("Available columns in sample:", Object.keys(sampleData[0]))
            }
          }
        } catch (sampleError) {
          console.log("❌ Sample data fetch threw error:", sampleError)
        }

        // Test minimal insert to see what columns are actually required
        console.log("=== TESTING MINIMAL INSERT ===")
        try {
          const testTaskNumber = `TEST${Date.now()}`
          const { data: insertData, error: insertError } = await supabase
            .from("housekeeping_tasks")
            .insert({
              task_number: testTaskNumber,
              hotel_id: "550e8400-e29b-41d4-a716-446655440000",
              room_id: "550e8400-e29b-41d4-a716-446655440001", // Valid UUID format
              type: "test",
              status: "pending",
              priority: "medium",
              estimated_time: 45
            })
            .select()
            .single()

          if (insertError) {
            console.log("❌ Minimal insert failed:", insertError)
            console.log("   Error code:", insertError.code)
            console.log("   Error message:", insertError.message)
            console.log("   Error details:", insertError.details)
            console.log("   Error hint:", insertError.hint)
          } else {
            console.log("✅ Minimal insert successful:", insertData)
            // Clean up test data
            await supabase
              .from("housekeeping_tasks")
              .delete()
              .eq("task_number", testTaskNumber)
            console.log("✅ Test data cleaned up")
          }
        } catch (insertError) {
          console.log("❌ Minimal insert threw error:", insertError)
        }

      } catch (inspectError) {
        console.error("Column inspection failed:", inspectError)
      }

    } catch (error) {
      console.error("Database connection test error:", error)
    }
  }

  useEffect(() => {
    filterRooms()
  }, [rooms, searchTerm, statusFilter, sortBy, sortDir])

  const fetchRooms = async () => {
    try {
      setIsLoading(true)
      const data = await roomService.getRooms()
      // Normalize to ensure `type` exists for UI usage
      const normalized: UIRoom[] = (data as DbRoom[]).map((r: any) => ({
        ...r,
        type: r.room_type?.name || r.type || "standard",
        status: r.status || "available"
      }))
      setRooms(normalized)
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast({
        title: "Error",
        description: "Failed to fetch rooms",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRoomTypes = async () => {
    try {
      const types = await roomTypeService.getRoomTypes()
      setRoomTypes(types)
    } catch (e) {
      console.error('Failed to load room types', e)
    }
  }

  const fetchHousekeepingTasks = async () => {
    try {
      const data = await housekeepingService.getTasks()
      setHousekeepingTasks(data)
    } catch (error) {
      console.error("Error fetching housekeeping tasks:", error)
    }
  }

  const fetchStaff = async () => {
    try {
      const data = await staffService.getStaff()
      setStaff(data)
    } catch (error) {
      console.error("Error fetching staff:", error)
    }
  }

  const filterRooms = () => {
    let filtered = rooms

    if (searchTerm) {
      filtered = filtered.filter(room =>
        room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.type?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(room => room.status === statusFilter)
    }

    // Sorting
    const statusOrder: Record<string, number> = {
      available: 1,
      occupied: 2,
      cleaning: 3,
      maintenance: 4,
      blocked: 5,
      unclean: 6,
    }

    filtered = [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortBy === "number") {
        const aNum = parseInt(a.number, 10)
        const bNum = parseInt(b.number, 10)
        if (isNaN(aNum) || isNaN(bNum)) {
          cmp = a.number.localeCompare(b.number, undefined, { numeric: true })
        } else {
          cmp = aNum - bNum
        }
      } else if (sortBy === "price") {
        cmp = a.price - b.price
      } else if (sortBy === "floor") {
        cmp = a.floor - b.floor
      } else if (sortBy === "status") {
        cmp = (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999)
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    setFilteredRooms(filtered)
  }

  const handleCreateRoom = async () => {
    if (!formData.number || !formData.roomTypeId) {
      toast({
        title: "Validation Error",
        description: "Please fill room number and room type",
        variant: "destructive",
      })
      return
    }

    try {
      startSubmission() // Prevent theme switching during submission
      setIsCreatingRoom(true)
      await roomService.createRoom({
        number: formData.number,
        roomTypeId: formData.roomTypeId,
        price: formData.price || undefined,
        // capacity: formData.maxPax || undefined,
        floor: formData.floor,
        amenities: formData.amenities,
        syncPriceToType: formData.price === null || formData.price === 0
      })

      toast({
        title: "Success",
        description: "Room created successfully",
      })

      setIsAddDialogOpen(false)
      resetForm()
      fetchRooms()
    } catch (error) {
      console.error("Error creating room:", error)
      toast({
        title: "Error",
        description: `Error creating room: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingRoom(false)
      endSubmission() // Allow theme changes after submission
    }
  }

  const handleUpdateRoom = async () => {
    if (!selectedRoom || !formData.number || !formData.roomTypeId) {
      toast({
        title: "Validation Error",
        description: "Please fill room number and room type",
        variant: "destructive",
      })
      return
    }

    try {
      startSubmission() // Prevent theme switching during submission
      setIsUpdatingRoom(true)
      // Use a flexible payload to satisfy DB while avoiding TS narrowing on Partial<Room>
      const updatePayload: any = {
        number: formData.number,
        price: formData.price,
        floor: formData.floor,
        amenities: formData.amenities,
      }
      if (formData.roomTypeId) updatePayload.room_type_id = formData.roomTypeId
      if (formData.price === null || formData.price === 0) updatePayload.syncPriceToType = true

      await roomService.updateRoom(selectedRoom.id, updatePayload)

      toast({
        title: "Success",
        description: "Room updated successfully",
      })

      setIsEditDialogOpen(false)
      resetForm()
      fetchRooms()
    } catch (error) {
      console.error("Error updating room:", error)
      toast({
        title: "Error",
        description: `Error updating room: ${error && (error as any).message ? (error as any).message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingRoom(false)
      endSubmission() // Allow theme changes after submission
    }
  }

  const handleStatusChange = async () => {
    if (!selectedRoom || !statusFormData.newStatus) {
      toast({
        title: "Validation Error",
        description: "Please select a new status",
        variant: "destructive",
      })
      return
    }

    try {
      startSubmission() // Prevent theme switching during submission
      setIsUpdatingStatus(true)
      const assignedStaffId = statusFormData.assignedStaffId === "no-assignment" ? undefined : statusFormData.assignedStaffId

      await roomService.updateRoomStatus(
        selectedRoom.id,
        statusFormData.newStatus,
        statusFormData.reason,
        assignedStaffId
      )

      toast({
        title: "Success",
        description: `Room status updated to ${statusFormData.newStatus}`,
      })

      setIsStatusDialogOpen(false)
      resetStatusForm()
      fetchRooms()
      fetchHousekeepingTasks()
    } catch (error) {
      console.error("Error updating room status:", error)
      toast({
        title: "Error",
        description: `Error updating room status: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
      endSubmission() // Allow theme changes after submission
    }
  }

  const handleCreateHousekeepingTask = async () => {
    if (!selectedRoom || !taskFormData.type || !taskFormData.estimatedTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      startSubmission() // Prevent theme switching during submission
      setIsCreatingTask(true)
      const assignedTo = taskFormData.assignedTo === "no-assignment" ? undefined : taskFormData.assignedTo

      console.log("Creating housekeeping task with data:", {
        roomId: selectedRoom.id,
        type: taskFormData.type,
        priority: taskFormData.priority,
        estimatedTime: taskFormData.estimatedTime,
        notes: taskFormData.notes,
        assignedTo
      })

      const result = await housekeepingService.createTask({
        roomId: selectedRoom.id,
        type: taskFormData.type,
        priority: taskFormData.priority,
        estimatedTime: taskFormData.estimatedTime,
        notes: taskFormData.notes,
        assignedTo
      })

      toast({
        title: "Success",
        description: "Housekeeping task created successfully",
      })

      setIsHousekeepingDialogOpen(false)
      resetTaskForm()
      await fetchHousekeepingTasks()
    } catch (error) {
      console.error("Error creating housekeeping task:", error)

      // Better error handling for different error types
      let errorMessage = "Failed to create housekeeping task"

      if (error && typeof error === 'object') {
        const errorObj = error as any
        if (errorObj.message && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message
        } else if (errorObj.details && typeof errorObj.details === 'string') {
          errorMessage = errorObj.details
        } else if (errorObj.hint && typeof errorObj.hint === 'string') {
          errorMessage = errorObj.hint
        } else if (errorObj.code && typeof errorObj.code === 'string') {
          errorMessage = `Database Error (${errorObj.code}): ${errorObj.message || 'Unknown database error'}`
        } else {
          // Try to extract meaningful information from the error object
          const errorStr = JSON.stringify(error, null, 2)
          console.log("Full error object:", errorStr)
          if (errorStr.length < 200) { // Only show if it's not too long
            errorMessage = `Error: ${errorStr}`
          }
        }
      }

      // Log additional error details for debugging
      console.log("Error type:", typeof error)
      console.log("Error constructor:", error?.constructor?.name)
      console.log("Error keys:", error ? Object.keys(error) : 'No keys')

      // Check if it's a database connection issue
      if (error && typeof error === 'object') {
        const errorObj = error as any
        if (errorObj.code === 'PGRST116' || errorObj.message?.includes('relation') || errorObj.message?.includes('table')) {
          errorMessage = "Database table 'housekeeping_tasks' does not exist. The system will create a temporary task for now. Please run the database setup script to enable full functionality."

          // Show additional info about the database setup
          console.error("DATABASE SETUP REQUIRED:")
          console.error("The 'housekeeping_tasks' table does not exist in your database.")
          console.error("Please run the SQL script: scripts/create-housekeeping-table.sql")
          console.error("Or execute this SQL in your Supabase dashboard:")
          console.error(`
            CREATE TABLE IF NOT EXISTS housekeeping_tasks (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              task_number VARCHAR(20) NOT NULL UNIQUE,
              hotel_id UUID NOT NULL,
              room_id UUID NOT NULL REFERENCES rooms(id),
              assigned_to UUID REFERENCES staff(id),
              type VARCHAR(100) NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'pending',
              priority VARCHAR(20) NOT NULL DEFAULT 'medium',
              estimated_time INTEGER NOT NULL DEFAULT 45,
              notes TEXT,
              scheduled_date TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `)
        } else if (errorObj.code === 'PGRST200' || errorObj.message?.includes('column') || errorObj.message?.includes('field')) {
          errorMessage = "Database column mismatch detected. The table exists but has different column names than expected."

          // Show additional info about column mismatch
          console.error("COLUMN MISMATCH DETECTED:")
          console.error("The 'housekeeping_tasks' table exists but has different column names.")
          console.error("Please check your table structure and ensure it matches the expected schema.")
          console.error("Expected columns:")
          console.error("- id (UUID)")
          console.error("- task_number (VARCHAR)")
          console.error("- hotel_id (UUID)")
          console.error("- room_id (UUID)")
          console.error("- assigned_to (UUID)")
          console.error("- type (VARCHAR)")
          console.error("- status (VARCHAR)")
          console.error("- priority (VARCHAR)")
          console.error("- estimated_time (INTEGER)")
          console.error("- notes (TEXT)")
          console.error("- scheduled_date (TIMESTAMP)")
          console.error("- created_at (TIMESTAMP)")
          console.error("- updated_at (TIMESTAMP)")
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreatingTask(false)
      endSubmission() // Allow theme changes after submission
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return

    try {
      startSubmission() // Prevent theme switching during submission
      await roomService.deleteRoom(roomId)
      toast({
        title: "Success",
        description: "Room deleted successfully",
      })
      fetchRooms()
    } catch (error) {
      console.error("Error deleting room:", error)
      toast({
        title: "Error",
        description: `Error deleting room: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      endSubmission() // Allow theme changes after submission
    }
  }

  const resetForm = () => {
    setFormData({
      number: "",
      roomTypeId: "",
      price: null,
      totalBeds: 0,
      maxPax: 1,
      floor: 1,
      amenities: ""
    })
  }

  const handleRoomTypeChange = (roomTypeId: string) => {
    const selectedRoomType = roomTypes.find(rt => rt.id === roomTypeId)
    if (selectedRoomType) {
    setFormData(prev => ({
        ...prev,
        roomTypeId,
        totalBeds: selectedRoomType.beds,
        maxPax: selectedRoomType.max_pax || 1,
        price: selectedRoomType.base_price
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        roomTypeId,
        totalBeds: 0,
        maxPax: 1,
        price: null
      }))
    }
  }

  const resetStatusForm = () => {
    setStatusFormData({
      newStatus: "",
      reason: "",
      assignedStaffId: ""
    })
  }

  const resetTaskForm = () => {
    setTaskFormData({
      type: "",
      priority: "medium",
      estimatedTime: 45,
      notes: "",
      assignedTo: ""
    })
  }

  const openEditDialog = (room: UIRoom) => {
    setSelectedRoom(room)
    const roomType = roomTypes.find(rt => rt.id === (room as any).room_type_id || (room as any).room_type?.id)
    setFormData({
      number: room.number,
      roomTypeId: (room as any).room_type_id || (room as any).room_type?.id || "",
      price: room.price || null,
      totalBeds: roomType?.beds || 0,
      maxPax: (room as any).room_type?.max_pax || 1,
      floor: room.floor,
      amenities: room.amenities || ""
    })
    setIsEditDialogOpen(true)
  }

  const openStatusDialog = (room: UIRoom) => {
    setSelectedRoom(room)
    setStatusFormData({
      newStatus: "",
      reason: "",
      assignedStaffId: ""
    })
    setIsStatusDialogOpen(true)
  }

  const openHousekeepingDialog = (room: UIRoom) => {
    setSelectedRoom(room)
    setTaskFormData({
      type: "Room Cleaning",
      priority: "medium",
      estimatedTime: 45,
      notes: "",
      assignedTo: ""
    })
    setIsHousekeepingDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-800"
      case "occupied": return "bg-blue-100 text-blue-800"
      case "cleaning": return "bg-yellow-100 text-yellow-800"
      case "maintenance": return "bg-orange-100 text-orange-800"
      case "blocked": return "bg-red-100 text-red-800"
      case "unclean": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available": return <CheckCircle className="h-4 w-4" />
      case "occupied": return <Users className="h-4 w-4" />
      case "cleaning": return <Sparkles className="h-4 w-4" />
      case "maintenance": return <Wrench className="h-4 w-4" />
      case "blocked": return <Ban className="h-4 w-4" />
      case "unclean": return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getValidStatusTransitions = (currentStatus: string) => {
    return roomService.getValidStatusTransitions(currentStatus)
  }

  const getRoomTasks = (roomId: string) => {
    return housekeepingTasks.filter(task => task.room_id === roomId)
  }

  const taskStatusStyles = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200"
      case "in-progress": return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const statusCounts = {
    total: rooms.length,
    available: rooms.filter(r => r.status === "available").length,
    occupied: rooms.filter(r => r.status === "occupied").length,
    cleaning: rooms.filter(r => r.status === "cleaning").length,
    maintenance: rooms.filter(r => r.status === "maintenance").length,
    blocked: rooms.filter(r => r.status === "blocked").length,
    unclean: rooms.filter(r => r.status === "unclean").length,
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border bg-card text-foreground shadow-md">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mt-1 text-3xl md:text-4xl font-bold leading-tight">Room Management</h1>
                <p className="mt-2 text-muted-foreground max-w-2xl">Manage inventory, statuses, and housekeeping with a clean, modern interface.</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Total <strong className="ml-1">{statusCounts.total}</strong></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Available <strong className="ml-1">{statusCounts.available}</strong></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Occupied <strong className="ml-1">{statusCounts.occupied}</strong></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Cleaning <strong className="ml-1">{statusCounts.cleaning}</strong></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Maint. <strong className="ml-1">{statusCounts.maintenance}</strong></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Blocked <strong className="ml-1">{statusCounts.blocked}</strong></span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={fetchRooms}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Room
                </Button>
              </div>
            </div>
            {/* Quick filters + Sort */}
            <div className="mt-6 rounded-2xl border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative">
                  <Input
                    placeholder="Search room number or type"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 shadow-sm"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "available", label: "Vacant", icon: getStatusIcon("available") },
                    { key: "occupied", label: "Occupied", icon: getStatusIcon("occupied") },
                    { key: "cleaning", label: "Cleaning", icon: getStatusIcon("cleaning") },
                    { key: "maintenance", label: "Maintenance", icon: getStatusIcon("maintenance") },
                    { key: "blocked", label: "Blocked", icon: getStatusIcon("blocked") },
                    { key: "unclean", label: "Dirty", icon: getStatusIcon("unclean") },
                  ].map(s => (
                    <Button
                      key={s.key}
                      size="sm"
                      variant={statusFilter === s.key ? "default" : "outline"}
                      onClick={() => setStatusFilter(s.key)}
                      className="rounded-full"
                    >
                      <span className="flex items-center gap-1.5">{s.icon && <span className="opacity-90">{s.icon}</span>}{s.label}</span>
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden text-muted-foreground md:block">Sort</div>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Room Number</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="floor">Floor</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setSortDir(prev => (prev === "asc" ? "desc" : "asc"))}
                    className="rounded-full"
                    title="Toggle sort direction"
                  >
                    <ArrowUpDown className={`h-4 w-4 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full md:w-auto rounded-xl border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TabsTrigger value="grid" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutGrid className="mr-2 h-4 w-4" /> Grid
            </TabsTrigger>
            <TabsTrigger value="floors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map className="mr-2 h-4 w-4" /> Floor View
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="mr-2 h-4 w-4" /> Tasks
            </TabsTrigger>
          </TabsList>

          {/* Grid View */}
          <TabsContent value="grid" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl border animate-pulse bg-muted" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredRooms.map((room) => {
                    const roomTasks = getRoomTasks(room.id)
                    const pendingTasks = roomTasks.filter(task => task.status === "pending" || task.status === "in-progress")

                    const coverGradients: Record<string, string> = {
                      standard: "from-slate-900 via-slate-800 to-slate-700",
                      deluxe: "from-indigo-900 via-violet-800 to-fuchsia-800",
                      suite: "from-teal-900 via-emerald-800 to-green-700",
                      presidential: "from-amber-900 via-orange-800 to-rose-800",
                    }

                    const key = (room.type || "standard")
                    const cover = coverGradients[key] || "from-slate-900 via-slate-800 to-slate-700"

                    return (
                      <div key={room.id} className="group relative rounded-2xl h-full">
                        <Card className="relative overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                          <div className="p-4 border-b flex items-center justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-wider text-muted-foreground">Room</div>
                              <div className="text-xl font-semibold">{room.number}</div>
                            </div>
                            <Badge className={`${getStatusColor(room.status)} shadow`}>
                              <span className="flex items-center gap-1">{getStatusIcon(room.status)}{room.status}</span>
                            </Badge>
                          </div>

                          <CardContent className="space-y-4 p-4 flex-1 flex flex-col">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-lg border bg-muted/40 p-2">
                                <div className="text-muted-foreground">Type</div>
                                <div className="font-semibold capitalize">{room.type}</div>
                              </div>
                              <div className="rounded-lg border bg-muted/40 p-2">
                                <div className="text-muted-foreground">Price</div>
                                <div className="font-semibold">₹{room.price}/night</div>
                              </div>
                              {/* <div className="rounded-lg border bg-muted/40 p-2">
                                <div className="text-muted-foreground">Capacity</div>
                                <div className="font-semibold">{room.capacity} guest(s)</div>
                              </div> */}
                              <div className="rounded-lg border bg-muted/40 p-2">
                                <div className="text-muted-foreground">Floor</div>
                                <div className="font-semibold">{room.floor}</div>
                              </div>
                            </div>

                            {room.amenities && room.amenities.length > 0 && (
                              <div className="text-sm">
                                <div className="text-muted-foreground mb-1">Amenities</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {room.amenities.split(",").map((amenity, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs rounded-full">
                                      {amenity.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {pendingTasks.length > 0 && (
                              <Alert className="bg-amber-50 border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800">
                                  {pendingTasks.length} pending housekeeping task(s)
                                </AlertDescription>
                              </Alert>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
                              <Button size="sm" variant="outline" onClick={() => openStatusDialog(room)} className="w-full">
                                <Settings className="h-3 w-3 mr-1" /> Status
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openHousekeepingDialog(room)} className="w-full">
                                <Sparkles className="h-3 w-3 mr-1" /> Housekeeping
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditDialog(room)} className="w-full">
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteRoom(room.id)} className="w-full">
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>

                {filteredRooms.length === 0 && (
                  <div className="text-center py-16">
                    <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">No rooms match your filters</h3>
                    <p className="text-muted-foreground">Try adjusting search or status filters.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Floor View */}
          <TabsContent value="floors" className="mt-6">
            <FloorWiseRoomStatus />
          </TabsContent>

          {/* Tasks View */}
          <TabsContent value="tasks" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Housekeeping Tasks</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={fetchHousekeepingTasks}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                <Select defaultValue="grid" onValueChange={(v) => setActiveTaskView(v as any)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="View" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid/List Toggle */}
            {activeTaskView === 'list' ? (
              <div className="divide-y rounded-xl border bg-card">
                {housekeepingTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={`border ${taskStatusStyles(task.status)}`}>{task.status}</Badge>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{task.type} · Room {task.room_id?.slice(0, 4) || ''}</div>
                        <div className="text-xs text-muted-foreground">#{task.task_number} · {task.priority} · {task.estimated_time} min</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="destructive" onClick={async () => { await housekeepingService.deleteTask(task.id); await fetchHousekeepingTasks() }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {housekeepingTasks.map((task) => (
                  <Card key={task.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{task.type}</CardTitle>
                          <CardDescription>Task #{task.task_number}</CardDescription>
                        </div>
                        <Badge className={`border ${taskStatusStyles(task.status)}`}>{task.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-muted-foreground">Priority</div>
                        <div className="font-medium capitalize">{task.priority}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-muted-foreground">ETA</div>
                        <div className="font-medium">{task.estimated_time} min</div>
                      </div>
                      {task.notes && <p className="text-muted-foreground line-clamp-2">{task.notes}</p>}
                      <div className="pt-2 flex justify-end">
                        <Button size="sm" variant="destructive" onClick={async () => { await housekeepingService.deleteTask(task.id); await fetchHousekeepingTasks() }}>Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {housekeepingTasks.length === 0 && (
              <div className="text-center py-16">
                <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">No housekeeping tasks</h3>
                <p className="text-muted-foreground">Create a task from any room card.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Floating Add Button */}
        <div className="fixed bottom-6 right-6 z-20">
          <Button size="lg" className="rounded-full shadow-lg" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Room
          </Button>
        </div>

        {/* Existing Dialogs */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="number">Room Number *</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="101"
                />
              </div>

              <div>
                <Label htmlFor="type">Room Type *</Label>
                <Select value={formData.roomTypeId} onValueChange={handleRoomTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map(rt => (
                      <SelectItem key={rt.id} value={rt.id}>{rt.name} (₹{rt.base_price}/night, {rt.beds} bed(s), max {rt.max_pax ?? '-'} pax)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Price per Night *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-fill from selected type base price.</p>
              </div>

              <div>
                <Label htmlFor="totalBeds">Total Beds</Label>
                <Input
                  id="totalBeds"
                  value={formData.totalBeds}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">From selected room type (read-only)</p>
              </div>

              <div>
                <Label htmlFor="maxPax">Max Pax *</Label>
                <Select value={formData.maxPax.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, maxPax: Number(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'Person' : 'People'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Maximum occupancy for this room</p>
              </div>

              <div>
                <Label htmlFor="floor">Floor *</Label>
                <Select value={formData.floor.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, floor: Number(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Floor</SelectItem>
                    <SelectItem value="2">2nd Floor</SelectItem>
                    <SelectItem value="3">3rd Floor</SelectItem>
                    <SelectItem value="4">4th Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amenities">Amenities</Label>
                <Input
                  id="amenities"
                  value={formData.amenities}
                  onChange={(e) => setFormData(prev => ({ ...prev, amenities: e.target.value }))}
                  placeholder="WiFi, TV, AC, Mini Bar"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateRoom} disabled={isCreatingRoom} className="flex-1">
                  {isCreatingRoom ? "Creating..." : "Create Room"}
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Room {selectedRoom?.number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-number">Room Number *</Label>
                <Input
                  id="edit-number"
                  value={formData.number}
                  onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="101"
                />
              </div>

              <div>
                <Label htmlFor="edit-type">Room Type *</Label>
                <Select value={formData.roomTypeId} onValueChange={handleRoomTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map(rt => (
                      <SelectItem key={rt.id} value={rt.id}>{rt.name} (₹{rt.base_price}/night, {rt.beds} bed(s), max {rt.max_pax ?? '-'} pax)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-price">Price per Night *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to sync from selected type base price on save.</p>
              </div>

              <div>
                <Label htmlFor="edit-totalBeds">Total Beds</Label>
                <Input
                  id="edit-totalBeds"
                  value={formData.totalBeds}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">From selected room type (read-only)</p>
              </div>

              <div>
                <Label htmlFor="edit-maxPax">Max Pax *</Label>
                <Select value={formData.maxPax.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, maxPax: Number(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'Person' : 'People'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Maximum occupancy for this room</p>
              </div>

              <div>
                <Label htmlFor="edit-floor">Floor *</Label>
                <Select value={formData.floor.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, floor: Number(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Floor</SelectItem>
                    <SelectItem value="2">2nd Floor</SelectItem>
                    <SelectItem value="3">3rd Floor</SelectItem>
                    <SelectItem value="4">4th Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-amenities">Amenities</Label>
                <Input
                  id="edit-amenities"
                  value={formData.amenities}
                  onChange={(e) => setFormData(prev => ({ ...prev, amenities: e.target.value }))}
                  placeholder="WiFi, TV, AC, Mini Bar"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateRoom} disabled={isUpdatingRoom} className="flex-1">
                  {isUpdatingRoom ? "Updating..." : "Update Room"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Room {selectedRoom?.number} Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newStatus">New Status *</Label>
                <Select value={statusFormData.newStatus} onValueChange={(value) => setStatusFormData(prev => ({ ...prev, newStatus: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRoom && getValidStatusTransitions(selectedRoom.status).map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason for Change</Label>
                <Textarea
                  id="reason"
                  value={statusFormData.reason}
                  onChange={(e) => setStatusFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Optional reason for status change"
                />
              </div>

              <div>
                <Label htmlFor="assignedStaff">Assign to Staff (Optional)</Label>
                <Select value={statusFormData.assignedStaffId} onValueChange={(value) => setStatusFormData(prev => ({ ...prev, assignedStaffId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-assignment">No assignment</SelectItem>
                    {staff.map(staffMember => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.name} ({staffMember.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleStatusChange} disabled={isUpdatingStatus} className="flex-1">
                  {isUpdatingStatus ? "Updating..." : "Update Status"}
                </Button>
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isHousekeepingDialogOpen} onOpenChange={setIsHousekeepingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Housekeeping Task for Room {selectedRoom?.number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="taskType">Task Type *</Label>
                <Select value={taskFormData.type} onValueChange={(value) => setTaskFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Room Cleaning">Room Cleaning</SelectItem>
                    <SelectItem value="Deep Cleaning">Deep Cleaning</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Inspection">Inspection</SelectItem>
                    <SelectItem value="Restocking">Restocking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select value={taskFormData.priority} onValueChange={(value) => setTaskFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estimatedTime">Estimated Time (minutes) *</Label>
                <Input
                  id="estimatedTime"
                  type="number"
                  value={taskFormData.estimatedTime}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, estimatedTime: Number(e.target.value) }))}
                  placeholder="45"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={taskFormData.notes}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for the task"
                />
              </div>

              <div>
                <Label htmlFor="assignedTo">Assign to Staff (Optional)</Label>
                <Select value={taskFormData.assignedTo} onValueChange={(value) => setTaskFormData(prev => ({ ...prev, assignedTo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-assignment">No assignment</SelectItem>
                    {staff.map(staffMember => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.name} ({staffMember.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateHousekeepingTask} disabled={isCreatingTask} className="flex-1">
                  {isCreatingTask ? "Creating..." : "Create Task"}
                </Button>
                <Button variant="outline" onClick={() => setIsHousekeepingDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}