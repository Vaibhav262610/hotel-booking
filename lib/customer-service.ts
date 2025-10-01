import { supabase } from './supabase'

export interface Customer {
  id: string
  hotel_id: string
  name: string
  email?: string
  phone: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  id_type?: string
  id_number?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  preferred_language?: string
  loyalty_points: number
  total_stays: number
  total_spent: number
  last_visit?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CustomerSearchResult {
  id: string
  name: string
  phone: string
  email?: string
  total_stays: number
  total_spent: number
  last_visit?: string
}

export interface CustomerStatistics {
  id: string
  name: string
  phone: string
  email?: string
  total_stays: number
  total_spent: number
  loyalty_points: number
  last_visit?: string
  total_bookings: number
  avg_booking_amount: number
  last_booking_date?: string
}

export const customerService = {
  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')

    if (error) throw error
    return data as Customer[]
  },

  async getCustomerById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Customer
  },

  async searchCustomers(searchTerm: string) {
    const { data, error } = await supabase
      .rpc('search_customers', { search_term: searchTerm })

    if (error) throw error
    return data as CustomerSearchResult[]
  },

  async getCustomerStatistics() {
    const { data, error } = await supabase
      .from('customer_statistics')
      .select('*')
      .order('total_spent', { ascending: false })

    if (error) throw error
    return data as CustomerStatistics[]
  },

  async createCustomer(customerData: {
    name: string
    email?: string
    phone: string
    address?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
    id_type?: string
    id_number?: string
    date_of_birth?: string
    gender?: string
    nationality?: string
    preferred_language?: string
    notes?: string
  }) {
    // Check if customer already exists with this phone
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerData.phone)
      .single()

    if (existingCustomer) {
      throw new Error(`Customer with phone ${customerData.phone} already exists`)
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        hotel_id: '550e8400-e29b-41d4-a716-446655440000',
        ...customerData
      })
      .select()
      .single()

    if (error) throw error
    return data as Customer
  },

  async updateCustomer(id: string, customerData: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...customerData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Customer
  },

  async deleteCustomer(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  async updateCustomerStats(customerId: string) {
    // Get customer's booking statistics
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('total_amount, created_at, status')
      .eq('customer_id', customerId)
      .eq('status', 'checked-out')

    if (bookingsError) throw bookingsError

    // Calculate statistics
    const totalStays = bookings.length
    const totalSpent = bookings.reduce((sum, booking) => sum + booking.total_amount, 0)
    const lastVisit = bookings.length > 0 
      ? new Date(Math.max(...bookings.map(b => new Date(b.created_at).getTime())))
      : null

    // Update customer statistics
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        total_stays: totalStays,
        total_spent: totalSpent,
        last_visit: lastVisit?.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)

    if (updateError) throw updateError
    return true
  },

  async addLoyaltyPoints(customerId: string, points: number, reason: string) {
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('loyalty_points')
      .eq('id', customerId)
      .single()

    if (fetchError) throw fetchError

    const newPoints = (customer.loyalty_points || 0) + points

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        loyalty_points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)

    if (updateError) throw updateError

    // Log the loyalty points addition
    await supabase
      .from('staff_logs')
      .insert({
        hotel_id: '550e8400-e29b-41d4-a716-446655440000',
        staff_id: '550e8400-e29b-41d4-a716-446655440000', // Default staff ID
        action: 'loyalty_points_added',
        details: `Added ${points} loyalty points to customer ${customerId}. Reason: ${reason}`,
        ip_address: '192.168.1.100'
      })

    return newPoints
  },

  async getCustomerBookings(customerId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        room:rooms(number, type),
        staff:staff_id(name)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getTopCustomers(limit: number = 10) {
    const { data, error } = await supabase
      .from('customer_statistics')
      .select('*')
      .order('total_spent', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as CustomerStatistics[]
  }
} 