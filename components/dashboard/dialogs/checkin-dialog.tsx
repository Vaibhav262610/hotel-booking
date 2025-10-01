"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  Camera,
  FileScan,
  User2,
} from "lucide-react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Booking } from "../types";

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: Booking[];
  onSuccess: () => void;
}

export function CheckInDialog({
  open,
  onOpenChange,
  bookings,
  onSuccess,
}: CheckInDialogProps) {
  const { toast } = useToast();

  // Selected booking
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Quick Check-In (Guest & booking meta)
  const [isReservation, setIsReservation] = useState("yes");
  const [reservationNumber, setReservationNumber] = useState("");
  const [arrivalMode, setArrivalMode] = useState("Walk-In/Direct");
  const [otaName, setOtaName] = useState("");
  const [bookingIdText, setBookingIdText] = useState("");
  const [contactCode, setContactCode] = useState("91");
  const [contactNumber, setContactNumber] = useState("");
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("Male");
  const [city, setCity] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [checkInMode, setCheckInMode] = useState("Day");
  const [allowCredit, setAllowCredit] = useState("No");
  const [foreignGuest, setForeignGuest] = useState("No");
  const [segmentName, setSegmentName] = useState("");
  const [businessSource, setBusinessSource] = useState("");
  const [mealPlan, setMealPlan] = useState("CP");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Check-in Details
  const [checkInType, setCheckInType] = useState("24 Hours CheckIn");
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [noOfDays, setNoOfDays] = useState(1);
  const computedCheckOut = useMemo(
    () => addDays(checkInDate, Number(noOfDays) || 1),
    [checkInDate, noOfDays]
  );
  const [graceTime, setGraceTime] = useState("01:00");
  const [paymentBy, setPaymentBy] = useState("Direct");
  const [allowChargesPosting, setAllowChargesPosting] = useState(true);

  // Address Details
  const [gstNumber, setGstNumber] = useState("");
  const [gstType, setGstType] = useState("UNREGISTERED");
  const [guestCompany, setGuestCompany] = useState("");
  const [address, setAddress] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [country, setCountry] = useState("India");
  const [nationality, setNationality] = useState("Indian");
  const [dob, setDob] = useState<string>("");
  const age = useMemo(() => {
    if (!dob) return "";
    const d = new Date(dob);
    const years = Math.max(
      0,
      Math.floor(differenceInCalendarDays(new Date(), d) / 365.25)
    );
    return String(years);
  }, [dob]);
  const [purposeOfVisit, setPurposeOfVisit] = useState("");
  const [visitRemark, setVisitRemark] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [bookingInstructions, setBookingInstructions] = useState("");
  // Prefill when booking is chosen
  useEffect(() => {
    if (!selectedBooking) return;
    // Pre-fill guest details
    setFirstName(selectedBooking.guest?.name?.split(" ")[0] || "");
    setLastName(
      selectedBooking.guest?.name?.split(" ").slice(1).join(" ") || ""
    );
    setEmail(selectedBooking.guest?.email || "");
    setContactNumber(selectedBooking.guest?.phone || "");

    // Handle address fields
    if (selectedBooking.guest?.address) {
      // Handle different address formats
      if (typeof selectedBooking.guest.address === "object") {
        // Object format from our updates
        setAddress(selectedBooking.guest.address.street_address || "");
        setCity(selectedBooking.guest.address.city || "PUDUCHERRY");
        setPinCode(selectedBooking.guest.address.postal_code || "605003");
        setState(selectedBooking.guest.address.state || "Tamil Nadu");
        setCountry(selectedBooking.guest.address.country || "India");
      } else if (typeof selectedBooking.guest.address === "string") {
        // Legacy string format
        setAddress(selectedBooking.guest.address);
      }
    }

    // Meta
    setReservationNumber(selectedBooking.booking_number || "");
    setNoOfDays(
      Math.max(
        1,
        differenceInCalendarDays(
          new Date(selectedBooking.check_out),
          new Date(selectedBooking.check_in)
        ) || 1
      )
    );
    setCheckInDate(new Date(selectedBooking.check_in));
    setPaymentBy(selectedBooking.payment_method || "Direct");
  }, [selectedBooking]);

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");

  const validate = () => {
    const errors: string[] = [];
    if (!selectedBooking) errors.push("Select a booking");
    if (!firstName) errors.push("First name is required");
    if (!contactNumber) errors.push("Contact number is required");
    if (!city) errors.push("City is required");
    if (!idNumber) errors.push("ID number is required");
    if (errors.length) {
      toast({
        title: "Missing information",
        description: errors.join(", "),
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleCheckIn = async () => {
    if (!selectedBooking) return;
    if (!validate()) return;

    try {
      // Update guest details (safe columns only)
      await supabase
        .from("guests")
        .update({
          title,
          name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          email,
          phone: contactNumber,
          address: {
            street_address: address || "",
            city: city || "PUDUCHERRY",
            postal_code: pinCode || "605003",
            state: state || "Tamil Nadu",
            country: country || "India",
          },
          id_type: idType || null,
          id_number: idNumber || null,
          date_of_birth: dob || null,
          nationality: nationality || null,
          company: guestCompany || null,
          guest_category: isVip ? "VIP" : null,
          notes:
            [
              gstNumber ? `GST: ${gstNumber} (${gstType})` : null,
              purposeOfVisit ? `Purpose: ${purposeOfVisit}` : null,
              visitRemark ? `Remark: ${visitRemark}` : null,
              specialInstructions ? `Special: ${specialInstructions}` : null,
              foreignGuest ? `Foreign Guest: ${foreignGuest}` : null,
              gender ? `Gender: ${gender}` : null,
            ]
              .filter(Boolean)
              .join(" | ") || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBooking.guest_id);

      // Update booking details and mark checked-in
      const checkInPayload: any = {
        status: "checked_in",
        actual_check_in: checkInDate.toISOString(),
        arrival_type: arrivalMode,
        payment_method: paymentBy,
        special_requests:
          specialInstructions || selectedBooking.special_requests || "",
        check_in_notes: JSON.stringify({
          isReservation,
          reservationNumber,
          otaName,
          bookingIdText,
          contactCode,
          checkInMode,
          allowCredit,
          foreignGuest,
          segmentName,
          businessSource,
          mealPlan,
          adults,
          children,
          checkInType,
          noOfDays,
          graceTime,
          allowChargesPosting,
          gstNumber,
          gstType,
          guestCompany,
          pinCode,
          state,
          country,
          nationality,
          dob,
          purposeOfVisit,
          visitRemark,
          bookingInstructions,
          isVip,
        }),
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("bookings")
        .update(checkInPayload)
        .eq("id", selectedBooking.id);

      // Update room status
      await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", selectedBooking.room_id);

      toast({
        title: "Success",
        description: "Guest checked in successfully!",
      });
      onOpenChange(false);
      setSelectedBooking(null);
      onSuccess();
    } catch (error) {
      console.error("Error during check-in:", error);
      toast({
        title: "Error",
        description: "Failed to check in guest. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[1100px] max-h-[92vh] overflow-y-auto"
        data-theme="light"
      >
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User2 className="h-5 w-5" /> Check-in Guest
          </DialogTitle>
          <DialogDescription>
            Select a confirmed booking and complete guest check-in
          </DialogDescription>
        </DialogHeader>

        {/* Booking selector */}
        <div className="space-y-2">
          <Label>Booking</Label>
          <Select
            onValueChange={(value) =>
              setSelectedBooking(bookings.find((b) => b.id === value) || null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select booking" />
            </SelectTrigger>
            <SelectContent>
              {confirmedBookings.map((booking) => (
                <SelectItem key={booking.id} value={booking.id}>
                  {booking.guest?.name} - Room {booking.room?.number} •{" "}
                  {booking.check_in ? format(new Date(booking.check_in), "PPp") : "No Date"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Form Sections */}
        {selectedBooking && (
          <div className="mt-4">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {/* Quick Check-In */}
              <AccordionItem value="quick" className="border rounded-md">
                <AccordionTrigger className="px-4 bg-emerald-50 text-emerald-900 hover:no-underline rounded-md">
                  Quick Check-In
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Is Reservation</Label>
                      <Select
                        value={isReservation}
                        onValueChange={setIsReservation}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reservation Number</Label>
                      <Input
                        value={reservationNumber}
                        onChange={(e) => setReservationNumber(e.target.value)}
                        placeholder="Enter Reservation No."
                      />
                    </div>
                    <div>
                      <Label>Arrival Mode</Label>
                      <Select
                        value={arrivalMode}
                        onValueChange={setArrivalMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Walk-In/Direct">
                            Walk-In/Direct
                          </SelectItem>
                          <SelectItem value="OTA">OTA</SelectItem>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>OTA</Label>
                      <Input
                        value={otaName}
                        onChange={(e) => setOtaName(e.target.value)}
                        placeholder="Enter OTA Name"
                      />
                    </div>
                    <div>
                      <Label>Booking ID</Label>
                      <Input
                        value={bookingIdText}
                        onChange={(e) => setBookingIdText(e.target.value)}
                        placeholder="Enter Booking ID"
                      />
                    </div>
                    <div>
                      <Label>Contact No.</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          value={contactCode}
                          onChange={(e) => setContactCode(e.target.value)}
                          className="col-span-1"
                        />
                        <Input
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          className="col-span-3"
                          placeholder="Enter Contact No."
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Select value={title} onValueChange={setTitle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mr">Mr</SelectItem>
                          <SelectItem value="Ms">Ms</SelectItem>
                          <SelectItem value="Mrs">Mrs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter First Name"
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter Last Name"
                      />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Enter City"
                      />
                    </div>
                    <div>
                      <Label>ID No. (Aadhaar, Other)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          placeholder="ID Type"
                        />
                        <Input
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder="Enter ID No"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter Email ID"
                      />
                    </div>
                    <div>
                      <Label>Check-In Mode</Label>
                      <Select
                        value={checkInMode}
                        onValueChange={setCheckInMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Day">Day</SelectItem>
                          <SelectItem value="24 Hours">24 Hours</SelectItem>
                          <SelectItem value="Hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Allow Credit</Label>
                      <Select
                        value={allowCredit}
                        onValueChange={setAllowCredit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Foreign Guest</Label>
                      <Select
                        value={foreignGuest}
                        onValueChange={setForeignGuest}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Segment Name</Label>
                      <Input
                        value={segmentName}
                        onChange={(e) => setSegmentName(e.target.value)}
                        placeholder="Select Segment"
                      />
                    </div>
                    <div>
                      <Label>Business Source</Label>
                      <Input
                        value={businessSource}
                        onChange={(e) => setBusinessSource(e.target.value)}
                        placeholder="Search business source"
                      />
                    </div>
                    <div>
                      <Label>Meal Plan</Label>
                      <Select value={mealPlan} onValueChange={setMealPlan}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CP">CP</SelectItem>
                          <SelectItem value="EP">EP</SelectItem>
                          <SelectItem value="MAP">MAP</SelectItem>
                          <SelectItem value="AP">AP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Media actions */}
                    <div className="flex items-end gap-2 col-span-1 sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <Camera className="h-4 w-4 mr-2" /> Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <FileScan className="h-4 w-4 mr-2" /> Scan Files
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Check-in Details */}
              <AccordionItem value="details" className="border rounded-md">
                <AccordionTrigger className="px-4 bg-sky-50 text-sky-900 hover:no-underline rounded-md">
                  Check-in Details
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Check-in Type</Label>
                      <Select
                        value={checkInType}
                        onValueChange={setCheckInType}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24 Hours CheckIn">
                            24 Hours CheckIn
                          </SelectItem>
                          <SelectItem value="Day Use">Day Use</SelectItem>
                          <SelectItem value="Hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col">
                      <Label>Check-in Date & Time</Label>
                      <div className="mt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />{" "}
                              {format(checkInDate, "PPp")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={checkInDate}
                              onSelect={(d) => d && setCheckInDate(d)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div>
                      <Label>No. of Days</Label>
                      <Input
                        type="number"
                        min={1}
                        value={noOfDays}
                        onChange={(e) =>
                          setNoOfDays(parseInt(e.target.value || "1"))
                        }
                      />
                    </div>
                    <div>
                      <Label>Check-out Date & Time</Label>
                      <div className="mt-2 text-sm font-medium">
                        {format(computedCheckOut, "PPp")}
                      </div>
                    </div>
                    <div>
                      <Label>Check-out Grace Time</Label>
                      <Input
                        value={graceTime}
                        onChange={(e) => setGraceTime(e.target.value)}
                        placeholder="01:00"
                      />
                    </div>
                    <div>
                      <Label>Payment By</Label>
                      <Select value={paymentBy} onValueChange={setPaymentBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Checkbox
                        id="allowCharges"
                        checked={allowChargesPosting}
                        onCheckedChange={(v) =>
                          setAllowChargesPosting(Boolean(v))
                        }
                      />
                      <Label htmlFor="allowCharges">
                        Allow Charges Posting
                      </Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Address Details */}
              <AccordionItem value="address" className="border rounded-md">
                <AccordionTrigger className="px-4 bg-slate-50 text-slate-900 hover:no-underline rounded-md">
                  Address Details
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>GST Number</Label>
                      <Input
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>GST Type</Label>
                      <Select value={gstType} onValueChange={setGstType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNREGISTERED">
                            UNREGISTERED
                          </SelectItem>
                          <SelectItem value="REGISTERED">REGISTERED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Guest Company</Label>
                      <Input
                        value={guestCompany}
                        onChange={(e) => setGuestCompany(e.target.value)}
                        placeholder="Enter Company"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label>Address</Label>
                      <Textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter Address"
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Pin Code</Label>
                      <Input
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Nationality</Label>
                      <Input
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input value={age} readOnly />
                    </div>
                    <div>
                      <Label>Purpose of Visit</Label>
                      <Select
                        value={purposeOfVisit}
                        onValueChange={setPurposeOfVisit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Visiting Purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Leisure">Leisure</SelectItem>
                          <SelectItem value="Conference">Conference</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Visit Remark</Label>
                      <Input
                        value={visitRemark}
                        onChange={(e) => setVisitRemark(e.target.value)}
                        placeholder="Enter Visiting Remark"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label>Guest Special Instructions</Label>
                      <Textarea
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Checkbox
                        id="vip"
                        checked={isVip}
                        onCheckedChange={(v) => setIsVip(Boolean(v))}
                      />
                      <Label htmlFor="vip">Is VIP</Label>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label>Booking Instructions</Label>
                      <Textarea
                        value={bookingInstructions}
                        onChange={(e) => setBookingInstructions(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleCheckIn} disabled={!selectedBooking}>
            Create Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}