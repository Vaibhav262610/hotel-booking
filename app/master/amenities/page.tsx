"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { DashboardLayout } from "@/components/dashboard-layout"

type Amenity = { id: number; name: string; inAllRooms: boolean }

export default function AmenitiesMasterPage() {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<Amenity[]>([])
  const [name, setName] = useState("")
  const [inAllRooms, setInAllRooms] = useState(true)

  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())), [rows, q])

  const add = () => {
    if (!name.trim()) return
    setRows((p) => [{ id: Date.now(), name: name.trim(), inAllRooms }, ...p])
    setName("")
    setInAllRooms(true)
  }

  const toggle = (id: number) => setRows((p) => p.map((r) => (r.id === id ? { ...r, inAllRooms: !r.inAllRooms } : r)))
  const remove = (id: number) => setRows((p) => p.filter((r) => r.id !== id))
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Amenities Master</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Input placeholder="Amenity Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <div className="flex items-center gap-2">
            <span className="text-sm">In All Rooms</span>
            <Switch checked={inAllRooms} onCheckedChange={setInAllRooms} />
          </div>
          <Button onClick={add}>New Amenity</Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amenity Name</TableHead>
                <TableHead className="w-40">In All Rooms</TableHead>
                <TableHead className="w-40">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No Records Found</TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>
                      <Switch checked={r.inAllRooms} onCheckedChange={() => toggle(r.id)} />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>      </CardContent>
      </Card>
    </DashboardLayout>
  )
}


