"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { roomService, staffService } from "@/lib/supabase";
import { NewBookingDialog } from "@/components/dashboard/dialogs/new-booking-dialog";

export default function MakeBookingPage() {
  const [open, setOpen] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, s] = await Promise.all([roomService.getRooms(), staffService.getStaff()]);
        setRooms(r || []);
        setStaff(s || []);
      } catch (e) {
        console.error("Failed to load booking prerequisites", e);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <NewBookingDialog asPage rooms={rooms as any} staff={staff as any} onSuccess={() => { }} />
        </div>
      </div>
    </DashboardLayout>
  );
}


