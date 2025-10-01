"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardLayout } from "@/components/dashboard-layout"

type Paper = { id: number; name: string; status: "Active" | "Inactive" }

export default function NewsPaperMasterPage() {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<Paper[]>([])
  const [name, setName] = useState("")

  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())), [rows, q])

  const add = () => {
    if (!name.trim()) return
    setRows((p) => [{ id: Date.now(), name: name.trim(), status: "Active" }, ...p])
    setName("")
  }

  const toggle = (id: number) => setRows((p) => p.map((r) => (r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r)))
  const remove = (id: number) => setRows((p) => p.filter((r) => r.id !== id))
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>News Paper Master</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Quick search" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Input placeholder="News Paper Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Button onClick={add}>Add New</Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>News Paper Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-48">Actions</TableHead>
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
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => toggle(r.id)}>
                        {r.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>        </div>
      </CardContent>
    </Card>
    </DashboardLayout>
  )
}


