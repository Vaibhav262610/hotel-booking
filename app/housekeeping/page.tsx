"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import {
  housekeepingService,
  staffService,
  roomService,
  type HousekeepingTask,
  type Staff,
  type Room,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  pending: {
    variant: "destructive" as const,
    label: "Pending",
    icon: AlertCircle,
    color: "text-red-600",
  },
  "in-progress": {
    variant: "secondary" as const,
    label: "In Progress",
    icon: Clock,
    color: "text-blue-600",
  },
  completed: {
    variant: "default" as const,
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600",
  },
};

const priorityConfig = {
  high: {
    variant: "destructive" as const,
    label: "High",
    color: "text-red-600",
  },
  medium: {
    variant: "secondary" as const,
    label: "Medium",
    color: "text-blue-600",
  },
  low: { variant: "outline" as const, label: "Low", color: "text-gray-600" },
};

const taskTypeConfig = {
  "Checkout Cleaning": {
    label: "Checkout Cleaning",
    color: "bg-red-100 text-red-800",
  },
  "Daily Cleaning": {
    label: "Daily Cleaning",
    color: "bg-blue-100 text-blue-800",
  },
  "Deep Cleaning": {
    label: "Deep Cleaning",
    color: "bg-purple-100 text-purple-800",
  },
  "Maintenance Cleaning": {
    label: "Maintenance Cleaning",
    color: "bg-orange-100 text-orange-800",
  },
  "Emergency Cleaning": {
    label: "Emergency Cleaning",
    color: "bg-red-100 text-red-800",
  },
};

interface TaskFormData {
  roomId: string;
  assignedTo: string;
  type: string;
  priority: string;
  estimatedTime: number;
  notes: string;
}

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(
    null
  );
  const [formData, setFormData] = useState<TaskFormData>({
    roomId: "",
    assignedTo: "",
    type: "Daily Cleaning",
    priority: "medium",
    estimatedTime: 30,
    notes: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksData, staffData, roomsData] = await Promise.all([
          housekeepingService.getTasks(),
          staffService.getStaff(),
          roomService.getRooms(),
        ]);
        setTasks(tasksData);
        setStaff(staffData.filter((s) => s.department === "Housekeeping"));
        setRooms(roomsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load housekeeping data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filterStatus === "all" || task.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });

  const handleCreateTask = async () => {
    try {
      const newTask = await housekeepingService.createTask({
        roomId: formData.roomId,
        assignedTo: formData.assignedTo,
        type: formData.type,
        priority: formData.priority,
        estimatedTime: formData.estimatedTime,
        notes: formData.notes,
      });

      setTasks((prev) => [newTask, ...prev]);
      toast({
        title: "Success",
        description: "Task created successfully",
      });

      // Reset form
      setFormData({
        roomId: "",
        assignedTo: "",
        type: "Daily Cleaning",
        priority: "medium",
        estimatedTime: 30,
        notes: "",
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updatedTask = await housekeepingService.updateTaskStatus(
        taskId,
        status
      );
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updatedTask : task))
      );

      toast({
        title: "Success",
        description: `Task status updated to ${status}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleAssignTask = async (taskId: string, staffId: string) => {
    try {
      const updatedTask = await housekeepingService.assignTask(taskId, staffId);
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updatedTask : task))
      );

      toast({
        title: "Success",
        description: "Task assigned successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    try {
      const updatedTask = await housekeepingService.updateTask(
        selectedTask.id,
        {
          roomId: formData.roomId,
          assignedTo: formData.assignedTo,
          type: formData.type,
          priority: formData.priority,
          estimatedTime: formData.estimatedTime,
          notes: formData.notes,
        }
      );

      setTasks((prev) =>
        prev.map((task) => (task.id === selectedTask.id ? updatedTask : task))
      );
      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleViewTask = (task: HousekeepingTask) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const handleEditTask = (task: HousekeepingTask) => {
    setSelectedTask(task);
    setFormData({
      roomId: task.room_id,
      assignedTo: task.assigned_to || "",
      type: task.type,
      priority: task.priority,
      estimatedTime: task.estimated_time,
      notes: task.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteTask = (task: HousekeepingTask) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      await housekeepingService.deleteTask(selectedTask.id);

      setTasks((prev) => prev.filter((task) => task.id !== selectedTask.id));
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
    }
  };

  const sendWhatsAppNotification = (housekeeper: string, room: string) => {
    // In a real app, this would integrate with WhatsApp Business API
    toast({
      title: "WhatsApp Notification",
      description: `Notification sent to ${housekeeper} for room ${room}`,
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-lg text-muted-foreground">
            Loading housekeeping data...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Housekeeping Management</h1>
            <p className="text-muted-foreground">
              Manage room cleaning tasks and housekeeper assignments
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Create a new housekeeping task
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Select
                    value={formData.roomId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, roomId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.number} - {room.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, assignedTo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Task Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Checkout Cleaning">
                          Checkout Cleaning
                        </SelectItem>
                        <SelectItem value="Daily Cleaning">
                          Daily Cleaning
                        </SelectItem>
                        <SelectItem value="Deep Cleaning">
                          Deep Cleaning
                        </SelectItem>
                        <SelectItem value="Maintenance Cleaning">
                          Maintenance Cleaning
                        </SelectItem>
                        <SelectItem value="Emergency Cleaning">
                          Emergency Cleaning
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedTime">
                    Estimated Time (minutes)
                  </Label>
                  <Input
                    id="estimatedTime"
                    type="number"
                    value={formData.estimatedTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimatedTime: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateTask}>Create Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Tasks
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {tasks.filter((t) => t.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter((t) => t.status === "in-progress").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Today
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter((t) => t.status === "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Available Staff
              </CardTitle>
              <User className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {staff.filter((h) => h.status === "active").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tasks List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Housekeeping Tasks</CardTitle>
                <CardDescription>
                  Manage and track cleaning tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterPriority}
                    onValueChange={setFilterPriority}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => {
                      const StatusIcon =
                        statusConfig[task.status as keyof typeof statusConfig]
                          .icon;
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">
                            {task.task_number}
                          </TableCell>
                          <TableCell>{task.room?.number || "N/A"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                taskTypeConfig[
                                  task.type as keyof typeof taskTypeConfig
                                ]?.color || "bg-gray-100 text-gray-800"
                              }
                            >
                              {task.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.staff?.name || "Unassigned"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                statusConfig[
                                  task.status as keyof typeof statusConfig
                                ].variant
                              }
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {
                                statusConfig[
                                  task.status as keyof typeof statusConfig
                                ].label
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>
                              {
                                priorityConfig[
                                  task.priority as keyof typeof priorityConfig
                                ]?.label
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>{task.estimated_time} min</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewTask(task)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTask(task)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTask(task)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Housekeepers List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Housekeeping Staff</CardTitle>
                <CardDescription>
                  Available staff and their current workload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {staff.map((housekeeper) => {
                  const tasksAssigned = tasks.filter(
                    (t) => t.assigned_to === housekeeper.id
                  ).length;
                  return (
                    <div
                      key={housekeeper.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>
                            {housekeeper.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{housekeeper.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {housekeeper.phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            housekeeper.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {housekeeper.status}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {tasksAssigned} tasks assigned
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common housekeeping operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    // Mark all in-progress tasks as completed
                    const inProgressTasks = tasks.filter(
                      (t) => t.status === "in-progress"
                    );
                    inProgressTasks.forEach((task) => {
                      handleUpdateTaskStatus(task.id, "completed");
                    });
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All Complete
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* View Task Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
              <DialogDescription>
                Complete information about this housekeeping task
              </DialogDescription>
            </DialogHeader>
            {selectedTask && (
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Task ID
                    </Label>
                    <p className="font-medium">{selectedTask.task_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Room
                    </Label>
                    <p className="font-medium">
                      {selectedTask.room?.number} - {selectedTask.room?.type}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Type
                    </Label>
                    <Badge
                      className={
                        taskTypeConfig[
                          selectedTask.type as keyof typeof taskTypeConfig
                        ]?.color
                      }
                    >
                      {selectedTask.type}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Priority
                    </Label>
                    <Badge
                      variant={
                        priorityConfig[
                          selectedTask.priority as keyof typeof priorityConfig
                        ].variant
                      }
                    >
                      {
                        priorityConfig[
                          selectedTask.priority as keyof typeof priorityConfig
                        ].label
                      }
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Assigned To
                    </Label>
                    <p className="font-medium">
                      {selectedTask.staff?.name || "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <Badge
                      variant={
                        statusConfig[
                          selectedTask.status as keyof typeof statusConfig
                        ].variant
                      }
                    >
                      {
                        statusConfig[
                          selectedTask.status as keyof typeof statusConfig
                        ].label
                      }
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Estimated Time
                  </Label>
                  <p className="font-medium">
                    {selectedTask.estimated_time} minutes
                  </p>
                </div>
                {selectedTask.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Notes
                    </Label>
                    <p className="text-sm">{selectedTask.notes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {selectedTask.status === "pending" && (
                    <Button
                      onClick={() =>
                        handleUpdateTaskStatus(selectedTask.id, "in-progress")
                      }
                      className="flex-1"
                    >
                      Start Task
                    </Button>
                  )}
                  {selectedTask.status === "in-progress" && (
                    <Button
                      onClick={() =>
                        handleUpdateTaskStatus(selectedTask.id, "completed")
                      }
                      className="flex-1"
                    >
                      Complete Task
                    </Button>
                  )}
                  {selectedTask.staff && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        sendWhatsAppNotification(
                          selectedTask.staff!.name,
                          selectedTask.room?.number || ""
                        )
                      }
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Notification
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Edit the details of this housekeeping task
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, roomId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.number} - {room.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, assignedTo: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Task Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checkout Cleaning">
                        Checkout Cleaning
                      </SelectItem>
                      <SelectItem value="Daily Cleaning">
                        Daily Cleaning
                      </SelectItem>
                      <SelectItem value="Deep Cleaning">
                        Deep Cleaning
                      </SelectItem>
                      <SelectItem value="Maintenance Cleaning">
                        Maintenance Cleaning
                      </SelectItem>
                      <SelectItem value="Emergency Cleaning">
                        Emergency Cleaning
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
                <Input
                  id="estimatedTime"
                  type="number"
                  value={formData.estimatedTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      estimatedTime: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateTask}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete task {selectedTask?.task_number}
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTask}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
