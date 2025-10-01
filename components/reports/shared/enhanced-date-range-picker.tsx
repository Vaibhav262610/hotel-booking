"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface EnhancedDateRangePickerProps {
  fromDate: Date | undefined
  toDate: Date | undefined
  onFromDateChange: (date: Date | undefined) => void
  onToDateChange: (date: Date | undefined) => void
  includeMobileNumber: boolean
  onIncludeMobileNumberChange: (checked: boolean) => void
  includeTariff: boolean
  onIncludeTariffChange: (checked: boolean) => void
}

export function EnhancedDateRangePicker({ 
  fromDate, 
  toDate, 
  onFromDateChange, 
  onToDateChange,
  includeMobileNumber,
  onIncludeMobileNumberChange,
  includeTariff,
  onIncludeTariffChange
}: EnhancedDateRangePickerProps) {
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from-date">From Date</Label>
          <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "dd/MM/yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(date) => {
                  onFromDateChange(date)
                  setFromDateOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="to-date">To Date</Label>
          <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !toDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "dd/MM/yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(date) => {
                  onToDateChange(date)
                  setToDateOpen(false)
                }}
                initialFocus
                disabled={(date) => fromDate ? date < fromDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Report Options */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Report Options</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-mobile" 
              checked={includeMobileNumber}
              onCheckedChange={onIncludeMobileNumberChange}
            />
            <Label 
              htmlFor="include-mobile" 
              className="text-sm font-normal cursor-pointer"
            >
              Incl Mobile No
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-tariff" 
              checked={includeTariff}
              onCheckedChange={onIncludeTariffChange}
            />
            <Label 
              htmlFor="include-tariff" 
              className="text-sm font-normal cursor-pointer"
            >
              Incl Tariff
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
