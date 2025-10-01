"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/dashboard-layout"

type OTA = { id: number; name: string; gstNo?: string; commissionMode?: "PERCENT" | "AMOUNT"; commissionRate?: number }

export default function OtaMasterPage() {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<OTA[]>([])
  const [form, setForm] = useState<Partial<OTA>>({ commissionMode: "PERCENT", commissionRate: 0 })
  const [editing, setEditing] = useState<OTA | null>(null)

  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())), [rows, q])

  const add = () => {
    if (!form.name) return
    setRows((p) => [{ id: Date.now(), name: form.name!, gstNo: form.gstNo, commissionMode: (form.commissionMode as any) ?? "PERCENT", commissionRate: Number(form.commissionRate ?? 0) }, ...p])
    setForm({ commissionMode: "PERCENT", commissionRate: 0 })
  }

  const save = () => {
    if (!editing) return
    setRows((p) => p.map((r) => (r.id === editing.id ? editing : r)))
    setEditing(null)
  }

  const remove = (id: number) => setRows((p) => p.filter((r) => r.id !== id))
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>OTA Master</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Dialog>
            <DialogTrigger asChild>
              <Button className="ml-auto">New OTA</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New OTA</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Website name" value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Input placeholder="GST No" value={form.gstNo ?? ""} onChange={(e) => setForm((f) => ({ ...f, gstNo: e.target.value }))} />
                <Input placeholder="Commission mode (PERCENT/AMOUNT)" value={form.commissionMode as any} onChange={(e) => setForm((f) => ({ ...f, commissionMode: e.target.value as any }))} />
                <Input placeholder="Commission rate" type="number" value={(form.commissionRate as any) ?? 0} onChange={(e) => setForm((f) => ({ ...f, commissionRate: Number(e.target.value) }))} />
              </div>
              <DialogFooter>
                <Button onClick={add}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Website name</TableHead>
                <TableHead>Gst tax no.</TableHead>
                <TableHead>Commission mode</TableHead>
                <TableHead>Commission rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No Records Found</TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.gstNo}</TableCell>
                    <TableCell>{r.commissionMode}</TableCell>
                    <TableCell>{r.commissionRate}</TableCell>
                    <TableCell className="space-x-2">
                      <Dialog open={!!editing && editing.id === r.id} onOpenChange={(o) => !o && setEditing(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" onClick={() => setEditing({ ...r })}>Edit</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit OTA</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input value={editing?.name ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, name: e.target.value } : ed))} />
                            <Input value={editing?.gstNo ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, gstNo: e.target.value } : ed))} />
                            <Input value={editing?.commissionMode ?? "PERCENT"} onChange={(e) => setEditing((ed) => (ed ? { ...ed, commissionMode: e.target.value as any } : ed))} />
                            <Input type="number" value={editing?.commissionRate ?? 0} onChange={(e) => setEditing((ed) => (ed ? { ...ed, commissionRate: Number(e.target.value) } : ed))} />
                          </div>
                          <DialogFooter>
                            <Button onClick={save}>Save</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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


