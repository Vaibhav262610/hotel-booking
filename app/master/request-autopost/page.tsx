"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/dashboard-layout"

type AutopostItem = { id: number; title: string }

export default function RequestAutopostPage() {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<AutopostItem[]>([])
  const [newTitle, setNewTitle] = useState("")
  const [editing, setEditing] = useState<AutopostItem | null>(null)

  const filtered = useMemo(
    () => items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  )

  const addItem = () => {
    if (!newTitle.trim()) return
    setItems((prev) => [{ id: Date.now(), title: newTitle.trim() }, ...prev])
    setNewTitle("")
  }

  const saveEdit = () => {
    if (!editing) return
    setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...i, title: editing.title } : i)))
    setEditing(null)
  }

  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id))
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Request Autopost</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input placeholder="Quick search" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
          <Dialog>
            <DialogTrigger asChild>
              <Button className="ml-auto">Add New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Request</DialogTitle>
              </DialogHeader>
              <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <DialogFooter>
                <Button onClick={addItem}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No Records Found</TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell className="space-x-2">
                      <Dialog open={!!editing && editing.id === row.id} onOpenChange={(o) => !o && setEditing(null)}>
                        <DialogTrigger asChild>
                          <Button variant="secondary" size="sm" onClick={() => setEditing({ ...row })}>Edit</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Request</DialogTitle>
                          </DialogHeader>
                          <Input value={editing?.title ?? ""} onChange={(e) => setEditing((ed) => (ed ? { ...ed, title: e.target.value } : ed))} />
                          <DialogFooter>
                            <Button onClick={saveEdit}>Save</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="destructive" size="sm" onClick={() => remove(row.id)}>Delete</Button>
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


