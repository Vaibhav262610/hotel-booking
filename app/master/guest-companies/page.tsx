"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/dashboard-layout"

type Company = { id: number; name: string; gstNo?: string; gstType?: string; contactPerson?: string; phone?: string; city?: string }

export default function GuestCompanyMasterPage() {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<Company[]>([])
  const [form, setForm] = useState<Partial<Company>>({})
  const [editing, setEditing] = useState<Company | null>(null)

  const filtered = useMemo(() => rows.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())), [rows, q])

  const add = () => {
    if (!form.name) return
    setRows((p) => [{ id: Date.now(), name: form.name!, gstNo: form.gstNo, gstType: form.gstType, contactPerson: form.contactPerson, phone: form.phone, city: form.city }, ...p])
    setForm({})
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
          <CardTitle>Guest Company Master</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input placeholder="Quick search" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Dialog>
            <DialogTrigger asChild>
              <Button className="ml-auto">Add New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Company</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Company Name" value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Input placeholder="GST No" value={form.gstNo ?? ""} onChange={(e) => setForm((f) => ({ ...f, gstNo: e.target.value }))} />
                <Input placeholder="GST Type" value={form.gstType ?? ""} onChange={(e) => setForm((f) => ({ ...f, gstType: e.target.value }))} />
                <Input placeholder="Contact Person" value={form.contactPerson ?? ""} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
                <Input placeholder="Phone" value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                <Input placeholder="City" value={form.city ?? ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
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
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>GST No</TableHead>
                <TableHead>GST Type</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No Records Found</TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.gstNo}</TableCell>
                    <TableCell>{c.gstType}</TableCell>
                    <TableCell>{c.contactPerson}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.city}</TableCell>
                    <TableCell className="space-x-2">
                      <Dialog open={!!editing && editing.id === c.id} onOpenChange={(o) => !o && setEditing(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" onClick={() => setEditing({ ...c })}>Edit</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Company</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input value={editing?.name ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, name: e.target.value } : ed))} />
                            <Input value={editing?.gstNo ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, gstNo: e.target.value } : ed))} />
                            <Input value={editing?.gstType ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, gstType: e.target.value } : ed))} />
                            <Input value={editing?.contactPerson ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, contactPerson: e.target.value } : ed))} />
                            <Input value={editing?.phone ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, phone: e.target.value } : ed))} />
                            <Input value={editing?.city ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, city: e.target.value } : ed))} />
                          </div>
                          <DialogFooter>
                            <Button onClick={save}>Save</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>Delete</Button>
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


