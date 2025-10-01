"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  CreditCard, 
  FileText,
  Receipt,
  Users,
  DollarSign,
  Building,
  MapPin,
  Phone,
  Mail,
  Calendar as CalendarIcon2,
  ChevronDown,
  Plus,
  Minus,
  Edit,
  Save,
  X
} from "lucide-react";
import { format, isBefore, isAfter, differenceInMinutes } from "date-fns";
import { Booking, BookingPaymentBreakdown, Staff, TaxType } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { bookingService } from "@/lib/supabase";
import { staffService, taxTypeService, calculateTaxes } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface EnhancedCheckoutDialogProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onCheckoutSuccess: () => void;
  roomId?: string; // Optional: if provided, checkout only this specific room
}

interface CheckoutFormData {
  actualCheckOutDate: Date;
  earlyCheckoutReason: string;
  priceAdjustment: number;
  adjustmentReason: string;
  remainingBalance: number;
  remainingBalancePaymentMethod: 'upi' | 'card' | 'cash' | 'bank';
  remainingBalanceCollectedBy: string;
  checkoutNotes: string;
  // Billing information
  billingName: string;
  billingCompany: string;
  billingAddress: string;
  gstNumber: string;
  gstType: string;
  // Tariff adjustments
  newRentTariff: number;
  tariffType: 'inclusive' | 'exclusive';
  applyTariff: 'rent_only' | 'all_charges';
  discountPerDay: number;
  discountRate: number;
  applyDiscountAllDays: boolean;
}

const earlyCheckoutReasons = [
  "Guest request",
  "Emergency",
  "Change of plans",
  "Dissatisfaction",
  "Health reasons",
  "Other",
];

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: '💰' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
];

const tariffTypes = [
  { value: 'inclusive', label: 'Inclusive of Tax' },
  { value: 'exclusive', label: 'Exclusive of Tax' },
];

const applyTariffOptions = [
  { value: 'rent_only', label: 'Rent Only' },
  { value: 'all_charges', label: 'All Charges' },
];

const gstTypes = [
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'UNREGISTERED', label: 'Unregistered' },
  { value: 'COMPOSITE', label: 'Composite' },
];

export function EnhancedCheckoutDialog({
  booking,
  isOpen,
  onClose,
  onCheckoutSuccess,
  roomId,
}: EnhancedCheckoutDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("information");
  const [isProcessing, setIsProcessing] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [chargeItems, setChargeItems] = useState<any[]>([]);

  const [formData, setFormData] = useState<CheckoutFormData>({
    actualCheckOutDate: new Date(),
    earlyCheckoutReason: "",
    priceAdjustment: 0,
    adjustmentReason: "",
    remainingBalance: 0,
    remainingBalancePaymentMethod: 'cash',
    remainingBalanceCollectedBy: "",
    checkoutNotes: "",
    billingName: "",
    billingCompany: "",
    billingAddress: "",
    gstNumber: "",
    gstType: "UNREGISTERED",
    newRentTariff: 0,
    tariffType: 'inclusive',
    applyTariff: 'rent_only',
    discountPerDay: 0,
    discountRate: 0,
    applyDiscountAllDays: false,
  });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [staff, taxes, charges] = await Promise.all([
          staffService.getStaff(),
          taxTypeService.getTaxTypes(),
          bookingService.getChargeItems(booking.id)
        ]);
        
        setStaffList(staff);
        setTaxTypes(taxes);
        setChargeItems(charges);
        
        if (staff.length > 0) {
          setFormData(prev => ({
            ...prev,
            remainingBalanceCollectedBy: staff[0].id
          }));
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast({
          title: "Error",
          description: "Failed to load required data.",
          variant: "destructive",
        });
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, toast, booking.id]);

  // Initialize form data when booking changes
  useEffect(() => {
    if (booking && isOpen) {
      const totalAmount = booking.payment_breakdown?.taxed_total_amount || booking.payment_breakdown?.total_amount || 0;
      const totalAdvance = (booking.payment_breakdown?.advance_cash || 0) + 
                          (booking.payment_breakdown?.advance_card || 0) + 
                          (booking.payment_breakdown?.advance_upi || 0) + 
                          (booking.payment_breakdown?.advance_bank || 0);
      
      const roomTotal = booking.booking_rooms?.reduce((sum, br) => sum + (br.room_total || 0), 0) || 0;

      setFormData(prev => ({
        ...prev,
        actualCheckOutDate: new Date(),
        remainingBalance: Math.max(0, totalAmount - totalAdvance),
        newRentTariff: totalAmount, // Use total amount (including taxes) instead of just room total
        billingName: booking.guest?.name || "",
        billingAddress: typeof booking.guest?.address === 'string' 
          ? booking.guest.address 
          : JSON.stringify(booking.guest?.address || {}),
      }));
    }
  }, [booking, isOpen]);

  // Calculate checkout timing and fees
  const scheduledCheckOut = booking ? new Date(booking.booking_rooms?.[0]?.check_out_date || new Date()) : new Date();
  const actualCheckOut = formData.actualCheckOutDate;
  const isEarlyCheckout = isBefore(actualCheckOut, scheduledCheckOut);
  const isLateCheckout = isAfter(actualCheckOut, scheduledCheckOut);
  const isOnTime = !isEarlyCheckout && !isLateCheckout;

  // Calculate late fee if applicable
  const lateMinutes = isLateCheckout ? differenceInMinutes(actualCheckOut, scheduledCheckOut) : 0;
  const gracePeriodMinutes = 60; // 1 hour grace period
  const lateFeePerHour = 100;
  const maxLateFee = 500;
  
  const isWithinGracePeriod = isLateCheckout && lateMinutes <= gracePeriodMinutes;
  const hoursLate = isLateCheckout ? Math.ceil((lateMinutes - gracePeriodMinutes) / 60) : 0;
  const calculatedLateFee = isLateCheckout && !isWithinGracePeriod 
    ? Math.min(hoursLate * lateFeePerHour, maxLateFee) 
    : 0;

  // Calculate outstanding the same way as check-in info dialog
  const toNumber = (v: any) => (typeof v === 'number' ? v : Number(v)) || 0;
  const baseTotal = toNumber(booking.payment_breakdown?.taxed_total_amount || booking.payment_breakdown?.total_amount || 0);
  const chargesTotal = chargeItems.reduce((sum, item) => sum + toNumber(item.total_amount), 0);
  const totalAmount = toNumber(baseTotal + chargesTotal);
  // Compute paid amount from all advance and receipt sources; force numeric coercion
  const paidAmount =
    toNumber(booking.payment_breakdown?.advance_cash) +
    toNumber(booking.payment_breakdown?.advance_card) +
    toNumber(booking.payment_breakdown?.advance_upi) +
    toNumber(booking.payment_breakdown?.advance_bank) +
    toNumber(booking.payment_breakdown?.receipt_cash) +
    toNumber(booking.payment_breakdown?.receipt_card) +
    toNumber(booking.payment_breakdown?.receipt_upi) +
    toNumber(booking.payment_breakdown?.receipt_bank);
  // Calculate outstanding locally to match Check-in Info (room + charges - paid)
  const calculatedOutstanding = Math.max(totalAmount - paidAmount, 0);
  
  // Calculate final amounts
  // Get the original room booking amount (before charges were added)
  const originalRoomTotal = toNumber(booking.payment_breakdown?.total_amount || 0);
  
  // The final amount should be: calculated outstanding + adjustments + late fees
  const finalAmount = calculatedOutstanding + formData.priceAdjustment + calculatedLateFee;
  const advanceTotal = (booking.payment_breakdown?.advance_cash || 0) + 
                      (booking.payment_breakdown?.advance_card || 0) + 
                      (booking.payment_breakdown?.advance_upi || 0) + 
                      (booking.payment_breakdown?.advance_bank || 0);
  // Since databaseOutstanding already accounts for advance payments, remainingBalance = finalAmount
  const remainingBalance = finalAmount;

  // Calculate tax breakdown
  // Tax calculation is not needed here since bookingTotal already includes taxes
  // The booking.payment_breakdown.taxed_total_amount already contains all taxes

  const handleInputChange = (field: keyof CheckoutFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckout = async () => {
    if (!booking) return;

    setIsProcessing(true);
    try {
      const result = await bookingService.checkOut(
        booking.id,
        formData.actualCheckOutDate,
        {
          earlyCheckoutReason: formData.earlyCheckoutReason,
          priceAdjustment: formData.priceAdjustment,
          finalAmount: finalAmount,
          adjustmentReason: formData.adjustmentReason,
          remainingBalance: remainingBalance > 0 ? remainingBalance : undefined,
          remainingBalancePaymentMethod:
            remainingBalance > 0 ? formData.remainingBalancePaymentMethod : undefined,
          remainingBalanceCollectedBy: remainingBalance > 0 ? formData.remainingBalanceCollectedBy : undefined,
          roomId: roomId // Pass the specific room ID for single room checkout
        }
      );

      if (!result.success) {
        throw new Error(result.error || "Checkout failed.");
      }

      toast({
        title: "Success",
        description: `Booking ${booking.booking_number} checked out successfully!`,
      });
      onCheckoutSuccess();
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Check-out Guest
          </DialogTitle>
          <DialogDescription>
            Complete the check-out process for the guest
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="information" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Check Out Information
            </TabsTrigger>
            <TabsTrigger value="charges" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Check Out Charges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Booking Selection */}
            <div className="space-y-2">
              <Label>Select Booking to Check Out</Label>
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <User className="h-4 w-4" />
                <span className="font-medium">{booking.guest?.name}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-sm text-muted-foreground">
                  {booking.booking_rooms?.map(br => br.room?.number).filter(Boolean).join(", ")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Guest & Booking Details */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Guest & Booking Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Room Type</Label>
                        <p className="font-medium">{booking.room?.room_type?.name || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Room No</Label>
                        <p className="font-medium">
                          {booking.booking_rooms?.map(br => br.room?.number).filter(Boolean).join(", ") || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Guest Name</Label>
                        <p className="font-medium">{booking.guest?.name || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">OTA</Label>
                        <p className="font-medium">{booking.ota_company || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Payment by</Label>
                        <p className="font-medium">{booking.ota_company || "Guest"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Rate Plan</Label>
                        <p className="font-medium">STD</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">No of Pax</Label>
                        <p className="font-medium">{booking.number_of_guests || 1}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Extra Pax</Label>
                        <p className="font-medium">{booking.extra_guests || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon2 className="h-5 w-5" />
                      Date & Time Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Check In Date</Label>
                        <p className="font-medium">
                          {format(new Date(booking.booking_rooms?.[0]?.check_in_date || new Date()), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Likely Checkout Date</Label>
                        <p className="font-medium">
                          {format(scheduledCheckOut, "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Current Checkout Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !actualCheckOut && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {actualCheckOut ? (
                              format(actualCheckOut, "dd/MM/yyyy HH:mm")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={actualCheckOut}
                            onSelect={(date) => date && handleInputChange('actualCheckOutDate', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-muted-foreground">CheckOut Grace Time</Label>
                      <Badge variant="outline">01:00</Badge>
                    </div>

                    {/* Checkout Status Badges */}
                    <div className="flex items-center gap-2">
                      {isEarlyCheckout && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Early Checkout
                        </Badge>
                      )}
                      {isLateCheckout && !isWithinGracePeriod && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Late Checkout
                        </Badge>
                      )}
                      {isLateCheckout && isWithinGracePeriod && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Grace Period
                        </Badge>
                      )}
                      {isOnTime && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          On Time
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Early Checkout Reason */}
                {isEarlyCheckout && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Early Checkout Reason</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={formData.earlyCheckoutReason}
                        onValueChange={(value) => handleInputChange('earlyCheckoutReason', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {earlyCheckoutReasons.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Tariff & Billing */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Tariff Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>New Rent Tariff</Label>
                      <Input
                        type="number"
                        value={formData.newRentTariff}
                        onChange={(e) => handleInputChange('newRentTariff', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Tariff</Label>
                      <Select
                        value={formData.tariffType}
                        onValueChange={(value: 'inclusive' | 'exclusive') => handleInputChange('tariffType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tariffTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Apply Tariff</Label>
                      <Select
                        value={formData.applyTariff}
                        onValueChange={(value: 'rent_only' | 'all_charges') => handleInputChange('applyTariff', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {applyTariffOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="applyTariffAllDays"
                        checked={formData.applyDiscountAllDays}
                        onChange={(e) => handleInputChange('applyDiscountAllDays', e.target.checked)}
                      />
                      <Label htmlFor="applyTariffAllDays">Apply Rent Tariff / Disc. All Days</Label>
                    </div>
                    <div>
                      <Label>Discount per day</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="By Amount" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">By Amount</SelectItem>
                          <SelectItem value="percentage">By Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Discount Rate</Label>
                      <Input
                        type="number"
                        value={formData.discountRate}
                        onChange={(e) => handleInputChange('discountRate', Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Billing Information
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingBilling(!isEditingBilling)}
                      >
                        {isEditingBilling ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Billing Name</Label>
                      <Input
                        value={formData.billingName}
                        onChange={(e) => handleInputChange('billingName', e.target.value)}
                        disabled={!isEditingBilling}
                      />
                    </div>
                    <div>
                      <Label>Billing Company Name</Label>
                      <Input
                        value={formData.billingCompany}
                        onChange={(e) => handleInputChange('billingCompany', e.target.value)}
                        disabled={!isEditingBilling}
                      />
                    </div>
                    <div>
                      <Label>Billing Address</Label>
                      <Textarea
                        value={formData.billingAddress}
                        onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                        disabled={!isEditingBilling}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>GST No</Label>
                      <Input
                        value={formData.gstNumber}
                        onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                        disabled={!isEditingBilling}
                      />
                    </div>
                    <div>
                      <Label>GST Type</Label>
                      <Select
                        value={formData.gstType}
                        onValueChange={(value) => handleInputChange('gstType', value)}
                        disabled={!isEditingBilling}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gstTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.checkoutNotes}
                  onChange={(e) => handleInputChange('checkoutNotes', e.target.value)}
                  placeholder="Any special instructions or notes for this checkout..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charges" className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Check Out Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Charges Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <ChevronDown className="h-4 w-4" />
                      A - CHARGES
                    </div>
                    <div className="ml-4 space-y-2">
            <div className="flex justify-between items-center">
                <span>Outstanding Balance (from Check-in Info)</span>
                <span className="font-medium">₹{calculatedOutstanding.toFixed(2)}</span>
            </div>
                      {formData.priceAdjustment !== 0 && (
                        <div className="flex justify-between items-center">
                          <span>Price Adjustment</span>
                          <span className="font-medium">₹{formData.priceAdjustment.toFixed(2)}</span>
                        </div>
                      )}
                      {calculatedLateFee > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Late Checkout Fee</span>
                          <span className="font-medium">₹{calculatedLateFee.toFixed(2)}</span>
                        </div>
                      )}
                        <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                          <span className="font-medium">Subtotal</span>
                          <span className="font-bold">₹{(calculatedOutstanding + formData.priceAdjustment + calculatedLateFee).toFixed(2)}</span>
                        </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Final Amount */}
                  <div className="flex justify-between items-center bg-green-100 p-4 rounded-lg">
                    <span className="text-lg font-bold">Amount Payable</span>
                    <span className="text-xl font-bold text-green-700">₹{finalAmount.toFixed(2)}</span>
                  </div>

                  {/* Payment Collection */}
                  {remainingBalance > 0 && (
                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader>
                        <CardTitle className="text-orange-800">Outstanding Balance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Amount Due</span>
                          <span className="text-lg font-bold text-orange-700">₹{remainingBalance.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Payment Method</Label>
                            <Select
                              value={formData.remainingBalancePaymentMethod}
                              onValueChange={(value: 'upi' | 'card' | 'cash' | 'bank') =>
                                handleInputChange('remainingBalancePaymentMethod', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method.value} value={method.value}>
                                    <div className="flex items-center gap-2">
                                      <span>{method.icon}</span>
                                      <span>{method.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Collected By</Label>
                            <Select
                              value={formData.remainingBalanceCollectedBy}
                              onValueChange={(value) => handleInputChange('remainingBalanceCollectedBy', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select staff member" />
                              </SelectTrigger>
                              <SelectContent>
                                {staffList.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
            {isProcessing ? "Processing..." : "Bill and Check Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}