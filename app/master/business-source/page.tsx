"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/dashboard-layout"

type BusinessSource = { id: number; sourcetypename: string; sourcename: string; sourcecontactno?: string }

export default function BusinessSourceMasterPage() {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<BusinessSource[]>([])
  const [form, setForm] = useState<Partial<BusinessSource>>({})
  const [editing, setEditing] = useState<BusinessSource | null>(null)

  const filtered = useMemo(() => rows.filter((r) => `${r.sourcetypename} ${r.sourcename}`.toLowerCase().includes(q.toLowerCase())), [rows, q])

  const add = () => {
    if (!form.sourcetypename || !form.sourcename) return
    setRows((p) => [{ id: Date.now(), sourcetypename: form.sourcetypename!, sourcename: form.sourcename!, sourcecontactno: form.sourcecontactno }, ...p])
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
          <CardTitle>Business Source Master</CardTitle>
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
                <DialogTitle>New Business Source</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Sourcetype name" value={form.sourcetypename ?? ""} onChange={(e) => setForm((f) => ({ ...f, sourcetypename: e.target.value }))} />
                <Input placeholder="Source name" value={form.sourcename ?? ""} onChange={(e) => setForm((f) => ({ ...f, sourcename: e.target.value }))} />
                <Input placeholder="Source contact no" value={form.sourcecontactno ?? ""} onChange={(e) => setForm((f) => ({ ...f, sourcecontactno: e.target.value }))} />
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
                <TableHead>Source type name</TableHead>
                <TableHead>Source name</TableHead>
                <TableHead>Source contact no.</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No Records Found</TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.sourcetypename}</TableCell>
                    <TableCell>{r.sourcename}</TableCell>
                    <TableCell>{r.sourcecontactno}</TableCell>
                    <TableCell className="space-x-2">
                      <Dialog open={!!editing && editing.id === r.id} onOpenChange={(o) => !o && setEditing(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" onClick={() => setEditing({ ...r })}>Edit</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Business Source</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input value={editing?.sourcetypename ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, sourcetypename: e.target.value } : ed))} />
                            <Input value={editing?.sourcename ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, sourcename: e.target.value } : ed))} />
                            <Input value={editing?.sourcecontactno ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, sourcecontactno: e.target.value } : ed))} />
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
            </TableBody>          </Table>
        </div>
      </CardContent>
    </Card>
    </DashboardLayout>
  )
}


