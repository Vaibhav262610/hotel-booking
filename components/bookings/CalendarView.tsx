"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";

interface CalendarViewProps {
  currentMonth: Date;
  days: Date[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  getBookingsForDay: (day: Date) => Array<{ id: string; guest?: { name?: string }; room?: { number?: string } }>;
  onOpenDay: (day: Date) => void;
}

export function CalendarView({ currentMonth, days, onPrevMonth, onNextMonth, getBookingsForDay, onOpenDay }: CalendarViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Calendar View</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPrevMonth}>
              ‹ Previous
            </Button>
            <span className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="outline" size="sm" onClick={onNextMonth}>
              Next ›
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium mb-2">
          <div className="p-2">Sun</div>
          <div className="p-2">Mon</div>
          <div className="p-2">Tue</div>
          <div className="p-2">Wed</div>
          <div className="p-2">Thu</div>
          <div className="p-2">Fri</div>
          <div className="p-2">Sat</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 h-24 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                  isToday && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                )}
                onClick={() => onOpenDay(day)}
              >
                <div className={cn("text-sm font-medium", isToday && "text-blue-600 dark:text-blue-400")}>{format(day, "d")}</div>
                <div className="space-y-1 mt-1">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <div key={booking.id} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded truncate">
                      {booking.guest?.name} - {booking.room?.number}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">+{dayBookings.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


