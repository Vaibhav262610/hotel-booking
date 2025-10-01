"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DashboardLayout } from "@/components/dashboard-layout";
import { guestService, Guest } from "@/lib/supabase";
import { Loader2, RefreshCw, Mail, Phone, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { AddressForm, AddressData, formatAddressCompact } from "@/components/ui/address-form";

// Interface for paginated response
interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function GuestMasterPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [rows, setRows] = useState<Guest[]>([]);
  const [form, setForm] = useState<Partial<Guest>>({
    address: null
  });
  const [editing, setEditing] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSizeOptions = [10, 20, 50];
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Function to toggle sort direction
  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  // Fetch guest data with pagination
  const fetchGuests = useCallback(async () => {
    setIsPageLoading(true);
    try {
      const result: PaginatedResponse<Guest> = await guestService.getPaginatedGuests({
        page: currentPage,
        pageSize,
        searchQuery: debouncedQuery,
        sortBy,
        sortDirection,
      });
      
      setRows(result.data);
      setTotalItems(result.count);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error fetching guests:", error);
      toast({
        title: "Error",
        description: "Failed to load guest data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsPageLoading(false);
    }
  }, [currentPage, pageSize, debouncedQuery, sortBy, sortDirection, toast]);

  // Fetch on mount and when pagination/search params change
  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  // Reset to first page when search query, page size, or sort changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedQuery, pageSize, sortBy, sortDirection]);

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + rows.length, totalItems);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    // Ensure page is within valid range
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const add = async () => {
    if (!form.first_name || !form.name) {
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {      // Create the guest in Supabase
      // Format address as an object according to the updated Guest interface
      const addressObj = {
        street_address: typeof form.address === 'string' ? form.address : (form.address?.street_address || ""),
        city: "PUDUCHERRY",
        postal_code: "605003",
        state: "Tamil Nadu",
        country: "India"
      };
      
      await guestService.createGuest({
        name: form.name || `${form.first_name} ${form.last_name || ''}`,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address: addressObj,
      });
      
      // Refresh the guest list
      await fetchGuests();
      
      // Reset form
      setForm({});
      
      toast({
        title: "Success",
        description: "Guest added successfully",
      });
    } catch (error) {
      console.error("Error adding guest:", error);
      toast({
        title: "Error",
        description: "Failed to add guest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const saveEdit = async () => {
    if (!editing) return;
    
    setIsSubmitting(true);
    try {
      // Format address as an object according to the updated Guest interface
      let formattedAddress;
      
      // Check if address is already an object with the right structure
      if (
        typeof editing.address === 'object' && 
        editing.address !== null &&
        'street_address' in editing.address
      ) {
        formattedAddress = editing.address;
      } 
      // If it's a string or doesn't have the right structure, create proper object
      else {
        const addressString = typeof editing.address === 'string' 
          ? editing.address 
          : "";
          
        formattedAddress = {
          street_address: addressString,
          city: "PUDUCHERRY",
          postal_code: "605003",
          state: "Tamil Nadu",
          country: "India"
        };
      }
      
      // Update the guest in Supabase
      await guestService.updateGuest(editing.id, {
        name: editing.name,
        first_name: editing.first_name,
        last_name: editing.last_name,
        email: editing.email,
        phone: editing.phone,
        address: formattedAddress,
      });
      
      // Refresh the guest list
      await fetchGuests();
      
      // Close edit mode
      setEditing(null);
      
      toast({
        title: "Success",
        description: "Guest updated successfully",
      });
    } catch (error) {
      console.error("Error updating guest:", error);
      toast({
        title: "Error",
        description: "Failed to update guest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    setIsSubmitting(true);
    try {
      // Delete the guest from Supabase
      await guestService.deleteGuest(id);
      
      // Refresh the guest list
      await fetchGuests();
      
      toast({
        title: "Success",
        description: "Guest deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting guest:", error);
      toast({
        title: "Error",
        description: "Failed to delete guest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <DashboardLayout>
      <Card>        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Guest Master</CardTitle>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by name, email or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
            />
            <Button 
              variant="outline" 
              onClick={fetchGuests}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button>New Guest</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Guest</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="First Name *"
                    value={form.first_name ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, first_name: e.target.value }))
                    }
                    required
                  />
                  <Input
                    placeholder="Last Name"
                    value={form.last_name ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, last_name: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Full Name *"
                    value={form.name ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                  <Input
                    placeholder="Phone"
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />                  <div className="col-span-2">
                    <AddressForm 
                      address={form.address || null}
                      onChange={(addressData) => 
                        setForm((f) => ({ ...f, address: addressData }))
                      }
                      showLabels={false}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={add} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead onClick={() => toggleSort("name")}>
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                      <p className="text-sm text-muted-foreground mt-2">Loading guest data...</p>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground h-24"
                    >
                      No Records Found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs">{g.id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="font-medium">{g.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {g.first_name} {g.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {g.phone && (
                          <div className="flex items-center text-sm mb-1">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            {g.phone}
                          </div>
                        )}
                        {g.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            {g.email}
                          </div>
                        )}
                      </TableCell>                      <TableCell>
                        <div className="max-w-[200px] truncate text-sm">
                          {typeof g.address === 'object' && g.address !== null 
                            ? g.address.street_address || '-'
                            : g.address || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 inline-block">
                          {g.status || 'Active'}
                        </div>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Dialog
                          open={!!editing && editing.id === g.id}
                          onOpenChange={(o) => !o && setEditing(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditing({ ...g })}
                            >
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Guest</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input
                                placeholder="Full Name"
                                value={editing?.name ?? ""}
                                onChange={(e) =>
                                  setEditing((ed) =>
                                    ed
                                      ? { ...ed, name: e.target.value }
                                      : ed
                                  )
                                }
                              />
                              <Input
                                placeholder="First Name"
                                value={editing?.first_name ?? ""}
                                onChange={(e) =>
                                  setEditing((ed) =>
                                    ed
                                      ? { ...ed, first_name: e.target.value }
                                      : ed
                                  )
                                }
                              />
                              <Input
                                placeholder="Last Name"
                                value={editing?.last_name ?? ""}
                                onChange={(e) =>
                                  setEditing((ed) =>
                                    ed
                                      ? { ...ed, last_name: e.target.value }
                                      : ed
                                  )
                                }
                              />
                              <Input
                                placeholder="Phone"
                                value={editing?.phone ?? ""}
                                onChange={(e) =>
                                  setEditing((ed) =>
                                    ed
                                      ? { ...ed, phone: e.target.value }
                                      : ed
                                  )
                                }
                              />
                              <Input
                                placeholder="Email"
                                value={editing?.email ?? ""}
                                onChange={(e) =>
                                  setEditing((ed) =>
                                    ed ? { ...ed, email: e.target.value } : ed
                                  )
                                }
                              />                              <Input
                                placeholder="Address"
                                value={
                                  typeof editing?.address === 'object' && editing?.address !== null 
                                    ? editing.address.street_address 
                                    : typeof editing?.address === 'string' 
                                      ? editing.address 
                                      : ""
                                }
                                onChange={(e) =>
                                  setEditing((ed) => {
                                    if (!ed) return ed;
                                    
                                    // If address is already an object, update street_address
                                    if (typeof ed.address === 'object' && ed.address !== null) {
                                      return {
                                        ...ed,
                                        address: {
                                          ...ed.address,
                                          street_address: e.target.value
                                        }
                                      };
                                    } 
                                    // Otherwise create a new address object
                                    else {
                                      return {
                                        ...ed,
                                        address: {
                                          street_address: e.target.value,
                                          city: "PUDUCHERRY",
                                          postal_code: "605003",
                                          state: "Tamil Nadu",
                                          country: "India"
                                        }
                                      };
                                    }
                                  })
                                }
                              />
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={saveEdit}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(g.id)}
                          disabled={isSubmitting}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}              </TableBody>
            </Table>
          </div>
          
          {/* Pagination UI */}
          {!isLoading && rows.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
              {/* Page size selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
              
              {/* Summary text */}
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of {totalItems} guests
              </div>
              
              {/* Pagination controls */}
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* First page */}
                  {currentPage > 2 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {currentPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Previous page if not at start */}
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(currentPage - 1)}>
                        {currentPage - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Current page */}
                  <PaginationItem>
                    <PaginationLink isActive>{currentPage}</PaginationLink>
                  </PaginationItem>
                  
                  {/* Next page if not at end */}
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(currentPage + 1)}>
                        {currentPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
