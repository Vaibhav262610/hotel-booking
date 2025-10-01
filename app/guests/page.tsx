"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Search,
  Plus,
  Edit,
  Eye,
  Phone,
  Mail,
  RefreshCw,
  UserPlus,
  Crown,
  TrendingUp,
  Activity,
  Trash2,
  Calendar,
  MapPin,
  Building,
  CreditCard,
  Star,
  MessageSquare,
  FileText,
  Gift,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Loader2,
  User
} from "lucide-react"
import { guestService, Guest, GuestPreference, GuestCommunication, GuestDocument, GuestSpecialRequest, GuestFeedback, GuestLoyalty, GuestVisit } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface GuestStats {
  totalGuests: number
  activeGuests: number
  repeatGuests: number
  vipGuests: number
}

interface GuestFormData {
  name: string
  email: string
  phone: string
  address: {
    street_address: string
    city: string
    postal_code: string
    state: string
    country: string
  } | string
  id_type: string
  id_number: string
  title: string
  first_name: string
  last_name: string
  date_of_birth: string
  nationality: string
  passport_number: string
  company: string
  designation: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  guest_category: string
  notes: string
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [stats, setStats] = useState<GuestStats>({
    totalGuests: 0,
    activeGuests: 0,
    repeatGuests: 0,
    vipGuests: 0
  })

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [guestDetails, setGuestDetails] = useState<{
    preferences: GuestPreference[]
    communications: GuestCommunication[]
    documents: GuestDocument[]
    specialRequests: GuestSpecialRequest[]
    feedback: GuestFeedback[]
    loyalty: GuestLoyalty | null
    visits: GuestVisit[]
  }>({
    preferences: [],
    communications: [],
    documents: [],
    specialRequests: [],
    feedback: [],
    loyalty: null,
    visits: []
  })

  // Form states
  const [formData, setFormData] = useState<GuestFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    id_type: "",
    id_number: "",
    title: "Mr.",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    nationality: "",
    passport_number: "",
    company: "",
    designation: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    guest_category: "regular",
    notes: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchGuests()
  }, [])

  useEffect(() => {
    filterGuests()
  }, [guests, searchQuery, filterCategory])

  const fetchGuests = async () => {
    try {
      setLoading(true)
      const data = await guestService.getGuests()
      setGuests(data)
      calculateStats(data)
    } catch (error) {
      console.error("Failed to fetch guests:", error)
      toast({
        title: "Error",
        description: "Failed to fetch guests",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (guestData: Guest[]) => {
    const activeGuests = guestData.filter(g => g.status === "active")
    const repeatGuests = guestData.filter(g => (g.total_stays || 0) >= 2)
    const vipGuests = guestData.filter(g => g.guest_category === "vip" || (g.total_spent || 0) >= 10000)

    setStats({
      totalGuests: guestData.length,
      activeGuests: activeGuests.length,
      repeatGuests: repeatGuests.length,
      vipGuests: vipGuests.length
    })
  }

  const filterGuests = () => {
    let filtered = guests

    if (searchQuery) {
      filtered = filtered.filter(guest =>
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.phone?.includes(searchQuery) ||
        guest.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(guest => guest.guest_category === filterCategory)
    }

    setFilteredGuests(filtered)
  }

  const getGuestCategoryColor = (category: string) => {
    switch (category) {
      case "vip": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "regular": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "corporate": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "travel_agent": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const handleViewGuest = async (guest: Guest) => {
    setSelectedGuest(guest)
    setIsViewDialogOpen(true)

    try {
      // Refresh core guest profile from DB to ensure latest fields
      const full = await guestService.getGuestById(guest.id)
      setSelectedGuest(full)
      const { bookingService } = await import("@/lib/supabase")
      const stats = await bookingService.getGuestBookingStats(guest.id)
      // Fetch all guest details
      const [preferences, communications, documents, specialRequests, feedback, loyalty, visits] = await Promise.all([
        guestService.getGuestPreferences(guest.id),
        guestService.getGuestCommunications(guest.id),
        guestService.getGuestDocuments(guest.id),
        guestService.getGuestSpecialRequests(guest.id),
        guestService.getGuestFeedback(guest.id),
        guestService.getGuestLoyalty(guest.id),
        guestService.getGuestVisits(guest.id)
      ])

      setGuestDetails({
        preferences,
        communications,
        documents,
        specialRequests,
        feedback,
        loyalty,
        visits
      })
      // Attach stats to selected guest for display
      setSelectedGuest(prev => prev ? ({ ...prev, total_stays: (stats as any)?.totalStays ?? prev.total_stays, total_spent: (stats as any)?.totalSpent ?? prev.total_spent, meal_plan: (stats as any)?.mealPlan ?? (prev as any)?.meal_plan }) as any : prev)
    } catch (error) {
      console.error("Failed to fetch guest details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch guest details",
        variant: "destructive"
      })
    }
  }

  const handleEditGuest = (guest: Guest) => {
    setSelectedGuest(guest)

    // Parse the name into first and last name
    const nameParts = guest.name?.split(' ') || []
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(' ') || ""
    // Create proper address object
    let addressValue;
    if (typeof guest.address === 'object' && guest.address !== null) {
      addressValue = guest.address;
    } else if (typeof guest.address === 'string') {
      addressValue = {
        street_address: guest.address,
        city: "PUDUCHERRY",
        postal_code: "605003",
        state: "Tamil Nadu",
        country: "India"
      };
    } else {
      addressValue = {
        street_address: "",
        city: "PUDUCHERRY",
        postal_code: "605003",
        state: "Tamil Nadu",
        country: "India"
      };
    }

    setFormData({
      name: guest.name || "",
      email: guest.email || "",
      phone: guest.phone || "",
      address: addressValue,
      id_type: guest.id_type || "",
      id_number: guest.id_number || "",
      title: guest.title || "Mr.",
      first_name: firstName,
      last_name: lastName,
      date_of_birth: guest.date_of_birth || "",
      nationality: guest.nationality || "",
      passport_number: guest.passport_number || "",
      company: guest.company || "",
      designation: guest.designation || "",
      emergency_contact_name: guest.emergency_contact_name || "",
      emergency_contact_phone: guest.emergency_contact_phone || "",
      emergency_contact_relationship: guest.emergency_contact_relationship || "",
      guest_category: guest.guest_category || "regular",
      notes: guest.notes || ""
    })
    setIsEditDialogOpen(true)
  }
  const handleAddGuest = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: {
        street_address: "",
        city: "PUDUCHERRY",
        postal_code: "605003",
        state: "Tamil Nadu",
        country: "India"
      },
      id_type: "",
      id_number: "",
      title: "Mr.",
      first_name: "",
      last_name: "",
      date_of_birth: "",
      nationality: "",
      passport_number: "",
      company: "",
      designation: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      guest_category: "regular",
      notes: ""
    })
    setIsAddDialogOpen(true)
  }

  const handleDeleteGuest = (guest: Guest) => {
    setSelectedGuest(guest)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Construct the full name from first and last name
      const fullName = `${formData.first_name} ${formData.last_name}`.trim()

      const guestData = {
        ...formData,
        name: fullName
      }

      // Use upsert so it works for both new and existing (by phone/email)
      await guestService.upsertGuest(guestData as any)
      toast({
        title: "Success",
        description: isEditDialogOpen ? "Guest updated successfully" : "Guest saved successfully",
      })
      if (isEditDialogOpen) setIsEditDialogOpen(false)
      if (isAddDialogOpen) setIsAddDialogOpen(false)

      fetchGuests()
    } catch (error) {
      console.error("Failed to save guest:", error)
      toast({
        title: "Error",
        description: "Failed to save guest",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Prefill Add dialog if phone/email already exists
  const prefillFromExisting = async (contact: { phone?: string; email?: string }) => {
    try {
      const needle = contact.phone || contact.email || ''
      if (!needle || needle.length < 3) return
      const results = await guestService.searchGuests(needle)
      if (!results || results.length === 0) return
      const exact = results.find((g: any) => (contact.phone && g.phone === contact.phone) || (contact.email && (g.email || '').toLowerCase() === (contact.email || '').toLowerCase())) || results[0]
      if (!exact) return

      // Build address object safely
      let addressValue: any
      if (typeof exact.address === 'object' && exact.address !== null) {
        addressValue = exact.address
      } else if (typeof exact.address === 'string') {
        addressValue = {
          street_address: exact.address,
          city: "PUDUCHERRY",
          postal_code: "605003",
          state: "Tamil Nadu",
          country: "India"
        }
      } else {
        addressValue = {
          street_address: "",
          city: "PUDUCHERRY",
          postal_code: "605003",
          state: "Tamil Nadu",
          country: "India"
        }
      }

      const nameParts = (exact.name || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      setFormData(prev => ({
        ...prev,
        name: exact.name || `${firstName} ${lastName}`.trim(),
        email: exact.email || prev.email,
        phone: exact.phone || prev.phone,
        address: addressValue,
        id_type: exact.id_type || prev.id_type,
        id_number: exact.id_number || prev.id_number,
        title: exact.title || prev.title,
        first_name: exact.first_name || firstName,
        last_name: exact.last_name || lastName,
        date_of_birth: exact.date_of_birth || prev.date_of_birth,
        nationality: exact.nationality || prev.nationality,
        passport_number: exact.passport_number || prev.passport_number,
        company: exact.company || prev.company,
        designation: exact.designation || prev.designation,
        emergency_contact_name: exact.emergency_contact_name || prev.emergency_contact_name,
        emergency_contact_phone: exact.emergency_contact_phone || prev.emergency_contact_phone,
        emergency_contact_relationship: exact.emergency_contact_relationship || prev.emergency_contact_relationship,
        guest_category: exact.guest_category || prev.guest_category,
        notes: exact.notes || prev.notes,
      }))
    } catch (e) {
      console.warn('Prefill lookup failed:', e)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedGuest) return

    try {
      await guestService.deleteGuest(selectedGuest.id)
      toast({
        title: "Success",
        description: "Guest deleted successfully",
      })
      setIsDeleteDialogOpen(false)
      fetchGuests()
    } catch (error) {
      console.error("Failed to delete guest:", error)
      toast({
        title: "Error",
        description: "Failed to delete guest",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      id_type: "",
      id_number: "",
      title: "Mr.",
      first_name: "",
      last_name: "",
      date_of_birth: "",
      nationality: "",
      passport_number: "",
      company: "",
      designation: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      guest_category: "regular",
      notes: ""
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Guest Management</h1>
            <p className="text-muted-foreground">
              Manage guest profiles, preferences, and communication history
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchGuests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {/* <Button onClick={handleAddGuest}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Guest
            </Button> */}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGuests}</div>
              <p className="text-xs text-muted-foreground">
                All registered guests
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Guests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGuests}</div>
              <p className="text-xs text-muted-foreground">
                Currently active profiles
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Guests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.repeatGuests}</div>
              <p className="text-xs text-muted-foreground">
                2+ previous stays
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VIP Guests</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vipGuests}</div>
              <p className="text-xs text-muted-foreground">
                High-value guests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter Guests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category-filter">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="travel_agent">Travel Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Guest Profiles</CardTitle>
            <CardDescription>
              {filteredGuests.length} guests found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{guest.name}</div>

                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {guest.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {guest.email}
                          </div>
                        )}
                        {guest.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {guest.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{guest.nationality || 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(guest as any).latest_check_in ? format(new Date((guest as any).latest_check_in), 'MMM dd, yyyy') : '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(guest as any).latest_check_out ? format(new Date((guest as any).latest_check_out), 'MMM dd, yyyy') : '-'}</TableCell>
                    <TableCell className="text-sm">₹{(((guest as any).latest_total_amount) || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewGuest(guest)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGuest(guest)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGuest(guest)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* View Guest Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Guest Profile: {selectedGuest?.name}
            </DialogTitle>
            <DialogDescription>
              Complete guest information and history
            </DialogDescription>
          </DialogHeader>

          {selectedGuest && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Full Name</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedGuest.title} {selectedGuest.first_name} {selectedGuest.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <p className="text-sm text-muted-foreground">{selectedGuest.date_of_birth || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{selectedGuest.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{selectedGuest.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <Badge className={getGuestCategoryColor(selectedGuest.guest_category || "regular")}>
                      {selectedGuest.guest_category || "regular"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nationality</Label>
                    <p className="text-sm text-muted-foreground">{selectedGuest.nationality || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Arrival From</Label>
                    <p className="text-sm text-muted-foreground">{(selectedGuest as any).arrival_from || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Company</Label>
                    <p className="text-sm text-muted-foreground">{selectedGuest.company || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">ID Type</Label>
                    <p className="text-sm text-muted-foreground">{selectedGuest.id_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">ID Number</Label>
                    <p className="text-sm text-muted-foreground">{selectedGuest.id_number || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <div className="text-sm text-muted-foreground">
                      {typeof selectedGuest.address === 'object' && selectedGuest.address !== null ? (
                        <>
                          <div>{selectedGuest.address.street_address || ""}</div>
                          <div>{selectedGuest.address.city || ""} {selectedGuest.address.postal_code ? `- ${selectedGuest.address.postal_code}` : ""}</div>
                          <div>{selectedGuest.address.state || ""}{selectedGuest.address.country ? `, ${selectedGuest.address.country}` : ""}</div>
                        </>
                      ) : (
                        <>{(selectedGuest.address as any) || "N/A"}</>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">City</Label>
                    <p className="text-sm text-muted-foreground">
                      {typeof selectedGuest.address === 'object' && selectedGuest.address !== null
                        ? selectedGuest.address.city
                        : "PUDUCHERRY"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Stays</Label>
                    <p className="text-sm text-muted-foreground">{Number((selectedGuest as any).total_stays || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Spent</Label>
                    <p className="text-sm text-muted-foreground">₹{Number((selectedGuest as any).total_spent || 0).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-4">
                {guestDetails.preferences.length > 0 ? (
                  <div className="space-y-2">
                    {guestDetails.preferences.map((pref) => (
                      <div key={pref.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{pref.preference_type}</p>
                          <p className="text-sm text-muted-foreground">{pref.preference_value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No preferences recorded</p>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                {guestDetails.documents.length > 0 ? (
                  <div className="space-y-2">
                    {guestDetails.documents.map((doc) => (
                      <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doc.document_type}</p>
                          <p className="text-sm text-muted-foreground">{doc.document_number || selectedGuest?.id_number || 'N/A'}</p>
                        </div>
                        <div className="text-right text-sm">
                          {doc.document_url ? (
                            <a href={doc.document_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View</a>
                          ) : (
                            <span className="text-muted-foreground">No document uploaded</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No documents uploaded. ID Number: {selectedGuest?.id_number || 'N/A'}</div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Guest Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guest Profile</DialogTitle>
            <DialogDescription>
              Update guest information and preferences
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Select value={formData.title} onValueChange={(value) => setFormData(prev => ({ ...prev, title: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest_category">Category</Label>
                <Select value={formData.guest_category} onValueChange={(value) => setFormData(prev => ({ ...prev, guest_category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="travel_agent">Travel Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={
                  typeof formData.address === 'object' && formData.address !== null
                    ? formData.address.street_address
                    : typeof formData.address === 'string'
                      ? formData.address
                      : ""
                }
                onChange={(e) => {
                  const addressValue = e.target.value;
                  setFormData(prev => {
                    // If address is already an object, update street_address
                    if (typeof prev.address === 'object' && prev.address !== null) {
                      return {
                        ...prev,
                        address: {
                          ...prev.address,
                          street_address: addressValue
                        }
                      };
                    }
                    // Otherwise create a new address object
                    return {
                      ...prev,
                      address: {
                        street_address: addressValue,
                        city: "PUDUCHERRY",
                        postal_code: "605003",
                        state: "Tamil Nadu",
                        country: "India"
                      }
                    };
                  });
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport_number">Passport Number</Label>
                <Input
                  id="passport_number"
                  value={formData.passport_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, passport_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Guest Dialog */}
      {/* <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
            <DialogDescription>
              Create a new guest profile with complete information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_title">Title</Label>
                <Select value={formData.title} onValueChange={(value) => setFormData(prev => ({ ...prev, title: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_guest_category">Category</Label>
                <Select value={formData.guest_category} onValueChange={(value) => setFormData(prev => ({ ...prev, guest_category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="travel_agent">Travel Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_first_name">First Name *</Label>
                <Input
                  id="add_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_last_name">Last Name *</Label>
                <Input
                  id="add_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_email">Email *</Label>
                <Input
                  id="add_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  onBlur={() => prefillFromExisting({ email: formData.email })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_phone">Phone *</Label>
                <Input
                  id="add_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  onBlur={() => prefillFromExisting({ phone: formData.phone })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add_address">Address</Label>
              <Textarea
                id="add_address"
                value={
                  typeof formData.address === 'object' && formData.address !== null
                    ? formData.address.street_address
                    : typeof formData.address === 'string'
                      ? formData.address
                      : ""
                }
                onChange={(e) => {
                  const addressValue = e.target.value;
                  setFormData(prev => {
                    // If address is already an object, update street_address
                    if (typeof prev.address === 'object' && prev.address !== null) {
                      return {
                        ...prev,
                        address: {
                          ...prev.address,
                          street_address: addressValue
                        }
                      };
                    }
                    // Otherwise create a new address object
                    return {
                      ...prev,
                      address: {
                        street_address: addressValue,
                        city: "PUDUCHERRY",
                        postal_code: "605003",
                        state: "Tamil Nadu",
                        country: "India"
                      }
                    };
                  });
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_nationality">Nationality</Label>
                <Input
                  id="add_nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_passport_number">Passport Number</Label>
                <Input
                  id="add_passport_number"
                  value={formData.passport_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, passport_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_company">Company</Label>
                <Input
                  id="add_company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_designation">Designation</Label>
                <Input
                  id="add_designation"
                  value={formData.designation}
                  onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add_notes">Notes</Label>
              <Textarea
                id="add_notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Guest
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog> */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the guest profile for {selectedGuest?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
} 