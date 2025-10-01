"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarIcon, Upload, X, CreditCard, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { guestService, bookingService, supabase, roomService, roomTypeService, staffService } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Room, Staff, NewBookingData } from "../types"
import { useTaxCalculation } from "../hooks/use-tax-calculation"
import { useRoomAvailability } from "../hooks/use-room-availability"

interface NewBookingDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  rooms: Room[]
  staff: Staff[]
  onSuccess: () => void
  asPage?: boolean
}

export function NewBookingDialog({ open = false, onOpenChange, rooms, staff, onSuccess, asPage = false }: NewBookingDialogProps) {
  const router = useRouter()
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [idImage, setIdImage] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchedRooms, setFetchedRooms] = useState<Room[] | null>(null)
  const [isRoomsLoading, setIsRoomsLoading] = useState<boolean>(false)
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [isSavingType, setIsSavingType] = useState<string | null>(null)
  // Grid model like reference: multiple room rows with counts
  const [roomRows, setRoomRows] = useState<Array<{
    id: string
    roomTypeId: string
    mealPlan: 'EP' | 'CP' | 'MAP'
    available: number
    numRooms: number | ''
    adult: number | ''
    child: number | ''
    extra: number | ''
    ratePlanName: string
    newRentTariff: number | ''
    tariff: number | ''
    applyInclusiveTax: boolean
    discountType: 'none' | 'percent' | 'flat'
    discountValue: number | ''
  }>>([])
  const [paxWarnings, setPaxWarnings] = useState<Record<string, string>>({})
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [adults, setAdults] = useState<number>(1)
  const [children, setChildren] = useState<number>(0)
  const [extraGuests, setExtraGuests] = useState<number>(0)
  // Single-method advance payment as per spec
  const [paymentBy, setPaymentBy] = useState<'cash' | 'card' | 'upi' | 'bank'>('cash')
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('')
  const [billTo, setBillTo] = useState<'guest' | 'company'>('guest')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [otaCompany, setOtaCompany] = useState<string>("")
  const [checkInMode, setCheckInMode] = useState<'day' | 'night'>('day')
  const [paymentPref, setPaymentPref] = useState<string>("")
  const [currentStaffId, setCurrentStaffId] = useState<string>("")

  const [newBookingData, setNewBookingData] = useState<NewBookingData>({
    roomId: "",
    advanceAmount: 0,
    paymentMethod: "",
    totalAmount: 0,
    taxCalculation: null
  })

  const { toast } = useToast()
  const { calculateHotelTaxes } = useTaxCalculation()
  const { newBookingRoomAvailability, checkRoomAvailability } = useRoomAvailability()

  // Helper: capacity is derived from room_types: beds (base) and max_pax (hard cap)
  const getTypeCaps = (roomOrType: any) => {
    const rt = roomOrType.room_type || roomOrType
    const beds = Number(rt?.beds ?? 0)
    const maxPax = Number(rt?.max_pax ?? 0)
    return { beds, maxPax }
  }

  // Helper: per-room base rate preference: room_type.base_price -> room.price
  const getRoomNightlyRate = (room: Room) => {
    const base = room.room_type?.base_price as number | undefined
    if (base != null && !Number.isNaN(base)) return Number(base)
    return Number((room as any).price || 0)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIdImage(file)
    }
  }

  const handleAddRoom = (roomId: string) => {
    if (!selectedRooms.includes(roomId)) {
      setSelectedRooms(prev => [...prev, roomId])
    }
    if (checkInDate && checkOutDate) {
      checkRoomAvailability(roomId, checkInDate, checkOutDate, 'newBooking')
    }
  }

  const handleRemoveRoom = (roomId: string) => {
    setSelectedRooms(prev => prev.filter(id => id !== roomId))
  }

  // Load rooms with room_type from DB when dialog opens
  useEffect(() => {
    const loadRooms = async () => {
      try {
        setIsRoomsLoading(true)
        const data = await roomService.getRooms()
        setFetchedRooms(data)
      } catch (e) {
        console.error('Failed to fetch rooms:', e)
      } finally {
        setIsRoomsLoading(false)
      }
    }
    const loadTypes = async () => {
      try {
        const types = await roomTypeService.getRoomTypes()
        setRoomTypes(types)
      } catch (e) {
        console.error('Failed to fetch room types:', e)
      }
    }
    const resolveLoggedInStaff = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const email = auth.user?.email
        if (!email) return
        const all = await staffService.getStaff()
        const match = (all || []).find((s: any) => s.email === email)
        if (match?.id) setCurrentStaffId(match.id)
      } catch (e) {
        console.warn('Failed to resolve logged-in staff', e)
      }
    }
    if (open || asPage) {
      loadRooms()
      loadTypes()
      resolveLoggedInStaff()
    }
  }, [open, asPage])

  const allRooms: Room[] = fetchedRooms ?? rooms

  const handleDateChange = (type: 'checkIn' | 'checkOut', date: Date | undefined) => {
    if (type === 'checkIn') setCheckInDate(date)
    if (type === 'checkOut') setCheckOutDate(date)
  }

  // Derived: whether dates are selected
  const datesSelected = !!checkInDate && !!checkOutDate

  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
      // Sum expected tariff from room rows (treat blanks as 0)
      const perNight = roomRows.reduce((sum, r) => {
        const tariff = Number(r.newRentTariff || r.tariff || 0) || 0
        const count = Number(r.numRooms || 0) || 0
        return sum + tariff * count
      }, 0)
      const taxCalculation = calculateHotelTaxes(perNight, nights)
      setNewBookingData(prev => ({ ...prev, totalAmount: taxCalculation.grandTotal, taxCalculation }))
    } else {
      setNewBookingData(prev => ({ ...prev, totalAmount: 0, taxCalculation: null }))
    }
  }, [checkInDate, checkOutDate, roomRows, calculateHotelTaxes])

  const addRoomRow = () => {
    setRoomRows(prev => ([
      ...prev,
      {
        id: crypto.randomUUID(),
        roomTypeId: (roomTypes && roomTypes.length > 0) ? roomTypes[0].id : '',
        mealPlan: 'CP',
        available: 0,
        numRooms: '',
        adult: '',
        child: '',
        extra: '',
        ratePlanName: 'STD',
        newRentTariff: '',
        tariff: (roomTypes && roomTypes.length > 0) ? Number(roomTypes[0].base_price || 0) : '',
        applyInclusiveTax: true,
        discountType: 'none',
        discountValue: '',
      }
    ]))
  }

  const removeRoomRow = (id: string) => setRoomRows(prev => prev.filter(r => r.id !== id))

  // Utilities for pax enforcement
  const getMaxPaxForType = (roomTypeId: string): number => {
    const rt = roomTypes.find((t: any) => t.id === roomTypeId)
    return Number(rt?.max_pax ?? 0)
  }

  const clampAdults = (adults: number | '', children: number | '', extra: number | '', max: number): number => {
    adults = Number(adults || 0)
    children = Number(children || 0)
    extra = Number(extra || 0)
    const allowed = Math.max(0, max - Math.ceil(children / 2) - extra)
    return Math.min(Math.max(1, adults), allowed > 0 ? allowed : 1)
  }

  const clampChildren = (adults: number | '', children: number | '', extra: number | '', max: number): number => {
    adults = Number(adults || 0)
    children = Number(children || 0)
    extra = Number(extra || 0)
    // children count as 0.5 -> effective children capacity = 2 * remaining
    const remainingHalf = Math.max(0, max - Number(adults) - Number(extra))
    const allowedChildren = remainingHalf * 2
    return Math.min(Math.max(0, children), allowedChildren)
  }

  const clampExtra = (adults: number | '', children: number | '', extra: number | '', max: number): number => {
    adults = Number(adults || 0)
    children = Number(children || 0)
    extra = Number(extra || 0)
    const allowed = Math.max(0, max - Number(adults) - Math.ceil(Number(children) / 2))
    return Math.min(Math.max(0, extra), allowed)
  }

  // Compute availability per row based on current dates
  useEffect(() => {
    const fetchAvail = async () => {
      if (!checkInDate || !checkOutDate) return
      const from = checkInDate.toISOString().slice(0, 10)
      const to = checkOutDate.toISOString().slice(0, 10)
      const updated = await Promise.all(roomRows.map(async (r) => {
        if (!r.roomTypeId) return r
        try {
          const data: any = await roomService.getAvailableRoomsByType(r.roomTypeId, from, to)
          const rooms = Array.isArray(data) ? data : (data?.rooms || [])
          // Set price per room from room_types.base_price if not set yet
          let tariff = r.tariff
          if (tariff === '' || tariff === undefined || tariff === null) {
            const type = roomTypes.find((t: any) => t.id === r.roomTypeId)
            if (type?.base_price != null) tariff = Number(type.base_price) || 0
          }
          const count = rooms.length
          return { ...r, available: count, tariff: tariff, __roomsAvail: rooms }
        } catch (_e) {
          // On error, keep previous availability for the row to avoid misleading fallback
          return r
        }
      }))
      setRoomRows(updated)
    }
    fetchAvail()
  }, [checkInDate, checkOutDate, roomRows.map(r => r.roomTypeId).join(',')])

  // Keep 'Avail' column synced only when dates are not selected; otherwise rely on date-aware fetch
  useEffect(() => {
    if (!checkInDate || !checkOutDate) {
      setRoomRows(prev => {
        let changed = false
        const updated = prev.map(r => {
          const count = (allRooms || []).filter((rm: any) => rm.room_type_id === r.roomTypeId && rm.status === 'available').length
          if (count !== r.available) { changed = true; return { ...r, available: count } }
          return r
        })
        return changed ? updated : prev
      })
    }
  }, [allRooms, roomRows.map(r => r.roomTypeId).join(','), checkInDate, checkOutDate])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Prevent double submission
    if (isLoading) {
      console.warn('Booking submission already in progress, ignoring duplicate request')
      return
    }
    
    const formData = new FormData(event.currentTarget)

    try {
      setIsLoading(true)

      const firstName = (formData.get("firstName") as string) || ""
      const lastName = (formData.get("lastName") as string) || ""
      const guestName = `${firstName} ${lastName}`.trim()
      const phone = formData.get("phone") as string
      const staffId = currentStaffId || (staff[0]?.id ?? "")
      const idType = formData.get("idType") as string
      const idNumber = formData.get("idNumber") as string
      const dateOfBirth = (formData.get("date_of_birth") as string) || ""
      const nationality = (formData.get("nationality") as string) || ""
      const arrivalTypeRaw = (formData.get('arrivalType') as string | null)
      const arrivalTypeNormalized = arrivalTypeRaw ? arrivalTypeRaw.replace('-', '_') : ''

      // Validate required fields
      const totalRequestedRooms = roomRows.reduce((sum, r) => sum + (Number(r.numRooms || 0) || 0), 0)
      
      // Check if staff is selected
      if (!staffId) {
        toast({
          title: "Validation Error",
          description: "Please select a staff member.",
          variant: "destructive",
        })
        return
      }
      
      // Check basic required fields
      if (!firstName.trim() || !lastName.trim() || !phone?.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in guest name and contact information.",
          variant: "destructive",
        })
        return
      }
      
      // Check ID fields
      if (!idType || !idNumber?.trim()) {
        toast({
          title: "Validation Error",
          description: "Please provide ID type and ID number.",
          variant: "destructive",
        })
        return
      }
      
      // Check room selection
      if (totalRequestedRooms === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one room.",
          variant: "destructive",
        })
        return
      }

      if (!checkInDate || !checkOutDate) {
        toast({
          title: "Validation Error",
          description: "Please select both check-in and check-out dates.",
          variant: "destructive",
        })
        return
      }      // Create guest first
      // Format address as an object according to the updated Guest interface
      const addressObj = {
        street_address: formData.get("street_address") as string || "",
        city: formData.get("city") as string || "PUDUCHERRY",
        postal_code: formData.get("postal_code") as string || "605003",
        state: formData.get("state") as string || "Tamil Nadu",
        country: formData.get("country") as string || "India"
      };

      const guestData = {
        name: guestName,
        email: formData.get("email") as string,
        phone: phone,
        address: addressObj,
        id_type: idType,
        id_number: idNumber,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        nationality: nationality,
        arrival_from: arrivalTypeNormalized,
      }

      // Create new guest for each booking (don't reuse existing guests)
      // This ensures each booking has its own guest record, even with same phone number
      const guest = await guestService.createGuest(guestData as any)

      // Defer ID image upload until after booking is created so we can use booking folder

      // Prepare advance split payments
      const advVal = Number(advanceAmount || 0)
      const advancePayments = (advVal > 0)
        ? [{ method: paymentBy, amount: advVal }] as { method: 'upi' | 'card' | 'cash' | 'bank', amount: number }[]
        : []

      // Auto-assign rooms per rows following capacity rules
      const assignableRooms: string[] = []
      for (const row of roomRows) {
        const numRooms = Number(row.numRooms || 0)
        if (!row.roomTypeId || numRooms <= 0) continue
        const type = roomTypes.find((rt: any) => rt.id === row.roomTypeId)
        const maxPax = Number(type?.max_pax ?? 0)
        const baseBeds = Number(type?.beds ?? 0)
        const effectivePax = Number(row.adult || 0) + Math.ceil(Number(row.child || 0) / 2) + Number(row.extra || 0)
        // Enforce: base from beds, hard cap from max_pax
        if (maxPax && effectivePax > maxPax) {
          toast({ title: 'Capacity exceeded', description: 'Pax exceeds max for selected room type', variant: 'destructive' })
          return
        }
        // Prefer date-aware available list if present
        const dateAware = (row as any).__roomsAvail as any[] | undefined
        const candidates = (dateAware && dateAware.length > 0)
          ? dateAware
          : (allRooms || []).filter((room: any) => room.room_type_id === row.roomTypeId && room.status === 'available')
        if (candidates.length < numRooms) {
          toast({ title: 'Insufficient availability', description: 'Not enough rooms available for selected type', variant: 'destructive' })
          return
        }
        for (let i = 0; i < numRooms; i++) {
          const availableRoom = candidates.find(c => !assignableRooms.includes(c.id))
          if (availableRoom) {
            assignableRooms.push(availableRoom.id)
          } else {
            toast({ title: 'Room assignment conflict', description: 'Unable to assign unique rooms for all rows', variant: 'destructive' })
            return
          }
        }
      }

      if (assignableRooms.length === 0) {
        toast({ title: 'Validation Error', description: 'Please select at least one valid room row.', variant: 'destructive' })
        return
      }

      // Create booking with rooms
      const booking = await bookingService.createBookingWithRooms({
        guestName: guestData.name,
        guestPhone: guestData.phone || "",
        guestEmail: guestData.email || "",
        staffId: staffId,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        checkInTime: formData.get("checkInTime") as string,
        checkOutTime: formData.get("checkOutTime") as string,
        totalAmount: newBookingData.taxCalculation?.grandTotal || 0,
        specialRequests: formData.get("specialRequests") as string,
        number_of_guests: adults,
        child_guests: children,
        extra_guests: extraGuests,
        arrival_type: (formData.get('arrivalType') as string | null)?.replace('-', '_') as any,
        bill_to: billTo,
        company_id: billTo === 'company' ? companyId : null,
        booking_channel: otaCompany ? 'ota' : 'direct',
        reserved_status: 'unconfirmed',
        check_in_mode: checkInMode,
        payment_method_pref: paymentPref || null,
        ota_company: otaCompany || undefined,
        rooms: (assignableRooms.length > 0 ? assignableRooms : selectedRooms).map(id => ({ id })),
        advancePayments,
      })

      // Upload ID image to per-booking folder with per-ID-type filename
      if (idImage) {
        try {
          const idTypeSafe = (formData.get('idType') as string || 'id').replace(/[^a-z0-9_-]/gi, '_')
          const ext = idImage.name.split('.').pop() || 'jpg'
          const path = `${booking.id}/${idTypeSafe}-${guest.id}-${Date.now()}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('guest-documents')
            .upload(path, idImage, { upsert: true })
          if (uploadError) console.error('Upload error:', uploadError)
        } catch (e) {
          console.error('Storage upload failed:', e)
        }
      }

      toast({
        title: "Success",
        description: "Booking created successfully!",
      })

      if (onOpenChange) onOpenChange(false)
      resetForm()
      onSuccess()
      // Redirect to /reservations
      router.push('/reservations')
    } catch (error) {
      console.error("Error creating booking:", error)
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNewBookingData({
      roomId: "",
      advanceAmount: 0,
      paymentMethod: "",
      totalAmount: 0,
      taxCalculation: null
    })
    setCheckInDate(undefined)
    setCheckOutDate(undefined)
    setIdImage(null)
    setSelectedRooms([])
    setAdults(1)
    setChildren(0)
    setExtraGuests(0)
    setAdvanceAmount(0)
  }

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header row: contact and billing */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bill To</Label>
          <Select value={billTo} onValueChange={(v: any) => setBillTo(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="guest">Guest</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>OTA Company (optional)</Label>
          <Input value={otaCompany} onChange={(e) => setOtaCompany(e.target.value)} placeholder="Booking.com, MakeMyTrip, ..." />
        </div>
      </div>
      {billTo === 'company' && (
        <div className="space-y-2">
          <Label>Company ID</Label>
          <Input value={companyId ?? ''} onChange={(e) => setCompanyId(e.target.value || null)} placeholder="Company UUID (picker to be added)" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" name="phone" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" name="nationality" placeholder="e.g., India" />
        </div>
      </div>
      <div className="space-y-4">
        <Label>Address Information</Label>
        <div className="space-y-2">
          <Label htmlFor="street_address">Street Address</Label>
          <Textarea id="street_address" name="street_address" placeholder="Street address, house number, etc." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue="PUDUCHERRY" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input id="postal_code" name="postal_code" defaultValue="605003" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue="Tamil Nadu" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue="India" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="idType">ID Type *</Label>
          <Select name="idType" required>
            <SelectTrigger>
              <SelectValue placeholder="Select ID type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aadhar">Aadhar Card</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="driving-license">Driving License</SelectItem>
              <SelectItem value="voter-id">Voter ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="idNumber">ID Number *</Label>
          <Input id="idNumber" name="idNumber" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="idImage">Upload ID Image</Label>
        <div className="flex items-center gap-2">
          <Input
            id="idImage"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("idImage")?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload ID
          </Button>
          {idImage && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">{idImage.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIdImage(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Pax & Room Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Adults</Label>
          <Input type="number" min={1} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="space-y-2">
          <Label>Children</Label>
          <Input type="number" min={0} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div className="space-y-2">
          <Label>Extra Guests</Label>
          <Input type="number" min={0} value={extraGuests} onChange={(e) => setExtraGuests(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arrivalType">Arrival Type</Label>
          <Select name="arrivalType">
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="OTA">OTA</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Check-in Mode</Label>
          <Select value={checkInMode} onValueChange={(v: any) => setCheckInMode(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Payment By</Label>
          <Select value={paymentBy} onValueChange={(v: any) => setPaymentBy(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Advance Amount</Label>
          <Input type="number" placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" min={0} value={advanceAmount} onChange={(e) => {
            const v = e.target.value
            setAdvanceAmount(v === '' ? '' : Math.max(0, Number(v) || 0))
          }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Check-in Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkInDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkInDate ? format(checkInDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={checkInDate} onSelect={(date) => handleDateChange('checkIn', date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Check-out Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkOutDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOutDate ? format(checkOutDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={checkOutDate} onSelect={(date) => handleDateChange('checkOut', date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Time pickers for same-day bookings */}
      {checkInDate && checkOutDate && checkInDate.toDateString() === checkOutDate.toDateString() && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="space-y-2">
            <Label>Check-in Time *</Label>
            <Input 
              type="time" 
              name="checkInTime" 
              defaultValue="12:00"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Check-out Time *</Label>
            <Input 
              type="time" 
              name="checkOutTime" 
              defaultValue="18:00"
              className="w-full"
            />
          </div>
          <div className="col-span-2 text-sm text-blue-600">
            ⏰ Same-day booking: Please specify check-in and check-out times
          </div>
        </div>
      )}

      {/* ROOM INFORMATION grid (reference-like) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Room Information</Label>
          <Button type="button" variant="outline" onClick={addRoomRow} disabled={!datesSelected}>+ Add</Button>
        </div>
        {!datesSelected && (
          <div className="text-xs text-muted-foreground px-1 pb-1">Select check-in and check-out dates to see available rooms.</div>
        )}
        <div className="overflow-x-auto border rounded">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-12 gap-2 bg-muted px-3 py-2 text-sm font-medium">
              <div className="col-span-2">Room Type</div>
              <div>Meal</div>
              <div>Avail</div>
              <div>No.Rooms</div>
              <div className="col-span-3">
                <div className="flex items-center justify-center font-semibold">Pax Per Room</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">Adult</div>
                  <div className="text-center">Child</div>
                  <div className="text-center">Extra</div>
                </div>
              </div>
              <div>Rate Plan</div>
              <div>Price / Room</div>
              <div>Inc.Tax</div>
              <div>Disc.</div>
            </div>
            {roomRows.map((row, idx) => {
              const maxPax = getMaxPaxForType(row.roomTypeId)
              const adultVal = clampAdults(row.adult, row.child, row.extra, maxPax)
              const childVal = clampChildren(row.adult, row.child, row.extra, maxPax)
              const extraVal = clampExtra(row.adult, row.child, row.extra, maxPax)
              const disabled = !datesSelected
              return (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-t">
                  <div className="col-span-2">
                    <Select disabled={disabled} value={row.roomTypeId} onValueChange={(val) => {
                      setRoomRows(prev => prev.map(r => {
                        if (r.id !== row.id) return r
                        const rt = roomTypes.find((t: any) => t.id === val)
                        const nextTariff = rt?.base_price != null ? Number(rt.base_price) || 0 : ''
                        return { ...r, roomTypeId: val, tariff: nextTariff }
                      }))
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((rt: any) => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.code || rt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select disabled={disabled} value={row.mealPlan} onValueChange={(v: any) => setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, mealPlan: v } : r))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EP">EP</SelectItem>
                        <SelectItem value="CP">CP</SelectItem>
                        <SelectItem value="MAP">MAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-center text-sm">{row.available || 0}</div>
                  <div>
                    <Input disabled={disabled} type="number" placeholder="No." className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={row.numRooms} onChange={(e) => {
                      const v = e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)
                      setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, numRooms: v } : r))
                    }} />
                  </div>
                  <div className="col-span-3 grid grid-cols-3 gap-2">
                    <Input disabled={disabled} type="number" placeholder="Adult" className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={row.adult} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Math.max(1, Number(e.target.value) || 1)
                      setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, adult: next } : r))
                    }} />
                    <Input disabled={disabled} type="number" placeholder="Child" className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={row.child} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)
                      setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, child: next } : r))
                    }} />
                    <Input disabled={disabled} type="number" placeholder="Extra" className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={row.extra} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)
                      setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, extra: next } : r))
                    }} />
                  </div>
                  <div>
                    <Input disabled value={row.ratePlanName} />
                  </div>
                  <div>
                    <Input disabled={disabled} type="number" placeholder="Price" value={row.tariff} onChange={(e) => {
                      const v = e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)
                      setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, tariff: v } : r))
                    }} />
                  </div>
                  <div>
                    <Select disabled={disabled} value={row.applyInclusiveTax ? 'yes' : 'no'} onValueChange={(v) => setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, applyInclusiveTax: v === 'yes' } : r))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select disabled={disabled} value={row.discountType} onValueChange={(v: any) => setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, discountType: v } : r))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="flat">Flat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input disabled={disabled} type="number" placeholder="Disc. Val" className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={row.discountValue} onChange={(e) => {
                      const v = e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)
                      setRoomRows(prev => prev.map(r => r.id === row.id ? { ...r, discountValue: v } : r))
                    }} />
                  </div>
                  <div className="text-right">
                    <Button type="button" variant="ghost" onClick={() => removeRoomRow(row.id)} disabled={disabled}>Remove</Button>
                  </div>
                </div>
              )
            })}
            {/* If a room type is selected, show available rooms list below the row */}
            {roomRows.map((r) => (
              r.roomTypeId ? (
                <div key={r.id + "-avail"} className="px-3 py-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Available rooms for selected type</div>
                  <div className="flex flex-wrap gap-2">
                    {datesSelected ? (((r as any).__roomsAvail || []) as any[]).map((rm: any) => (
                      <span key={rm.id} className="px-2 py-1 rounded border text-xs">{rm.number}</span>
                    )) : (
                      <span className="text-xs">Select dates to see availability</span>
                    )}
                  </div>
                  {datesSelected && (((r as any).__roomsAvail || []).length === 0) && (
                    <span className="text-xs">No rooms available</span>
                  )}
                </div>
              ) : null
            ))}
          </div>
        </div>
      </div>

      {/* Tax Breakdown Section */}
      {newBookingData.taxCalculation && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Breakdown
          </h4>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Room Charges ({newBookingData.taxCalculation.nights} nights):</span>
              <span className="font-medium">₹{newBookingData.taxCalculation.subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-blue-200 pt-3">
            <h5 className="text-sm font-semibold text-blue-800">Taxes & Charges</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">GST (12%):</span>
                <span>₹{newBookingData.taxCalculation.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CGST (6%):</span>
                <span>₹{newBookingData.taxCalculation.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SGST (6%):</span>
                <span>₹{newBookingData.taxCalculation.sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Luxury Tax (5%):</span>
                <span>₹{newBookingData.taxCalculation.luxuryTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Charge (10%):</span>
                <span>₹{newBookingData.taxCalculation.serviceCharge.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-blue-200 pt-3">
            <div className="flex justify-between text-lg font-semibold text-blue-900">
              <span>Total Amount:</span>
              <span>₹{newBookingData.taxCalculation.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Display Section */}
      {newBookingData.taxCalculation && Number(advanceAmount || 0) > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
          <h5 className="font-semibold text-blue-900">Payment Summary</h5>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">₹{newBookingData.taxCalculation.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Advance Paid:</span>
              <span className="font-medium text-green-700">₹{Number(advanceAmount || 0).toFixed(2)}</span>
            </div>
            <div className="border-t border-blue-200 pt-2">
              <div className="flex justify-between text-lg font-semibold text-blue-800">
                <span>Remaining Balance:</span>
                <span>₹{(newBookingData.taxCalculation.grandTotal - Number(advanceAmount || 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Remaining balance (₹{(newBookingData.taxCalculation.grandTotal - Number(advanceAmount || 0)).toFixed(2)})
              will be collected at check-in. Payment method will be selected during check-in process.
            </p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="specialRequests">Special Requests</Label>
        <Textarea id="specialRequests" name="specialRequests" />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Booking...
            </>
          ) : (
            "Create Booking"
          )}
        </Button>
      </DialogFooter>
    </form>
  )

  if (asPage) {
    return (
      <div className="w-full px-4 md:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Make a Booking</h1>
          <p className="text-sm text-muted-foreground">Create a new booking with multiple rooms</p>
        </div>
        <div className="grid gap-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">{FormContent}</div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-theme="light">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>Create a new booking</DialogDescription>
        </DialogHeader>
        {FormContent}
      </DialogContent>
    </Dialog>
  )
}
