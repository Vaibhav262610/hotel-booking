import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
    }

    // Parse dates
    const fromDateObj = new Date(fromDate.split('/').reverse().join('-'))
    const toDateObj = new Date(toDate.split('/').reverse().join('-'))
    
    // Set time to end of day for toDate
    toDateObj.setHours(23, 59, 59, 999)

    // Generate date range
    const dates = []
    const currentDate = new Date(fromDateObj)
    while (currentDate <= toDateObj) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const settlementRecords: any[] = []

    for (const date of dates) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      // Fetch bookings for this date
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          status,
          created_at,
          booking_rooms (
            id,
            room_rate,
            room_total,
            rooms (
              id,
              room_types (
                name
              )
            )
          ),
          booking_payment_breakdown (
            total_amount,
            taxed_total_amount,
            advance_cash,
            advance_card,
            advance_upi,
            advance_bank,
            receipt_cash,
            receipt_card,
            receipt_upi,
            receipt_bank,
            outstanding_amount
          ),
          payment_transactions (
            amount,
            payment_method,
            transaction_type,
            created_at
          ),
          charge_items (
            total_amount,
            created_at
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        continue
      }

      // Calculate totals for this date
      let totalRevenue = 0
      let roomRevenue = 0
      let serviceRevenue = 0
      let advanceCollections = 0
      let outstandingAmount = 0
      let cashCollections = 0
      let cardCollections = 0
      let upiCollections = 0
      let bankTransferCollections = 0
      let totalCollections = 0

      bookings?.forEach((booking) => {
        const paymentBreakdown = booking.booking_payment_breakdown
        const chargeItems = booking.charge_items || []
        
        // Room revenue
        const roomTotal = booking.booking_rooms?.reduce((sum, br) => sum + (br.room_total || 0), 0) || 0
        roomRevenue += roomTotal
        
        // Service revenue (charges)
        const serviceTotal = chargeItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
        serviceRevenue += serviceTotal
        
        // Total revenue
        totalRevenue += roomTotal + serviceTotal
        
        // Advance collections
        if (paymentBreakdown) {
          advanceCollections += (paymentBreakdown.advance_cash || 0) + 
                              (paymentBreakdown.advance_card || 0) + 
                              (paymentBreakdown.advance_upi || 0) + 
                              (paymentBreakdown.advance_bank || 0)
          
          outstandingAmount += paymentBreakdown.outstanding_amount || 0
        }
        
        // Payment collections
        booking.payment_transactions?.forEach((transaction) => {
          const amount = transaction.amount || 0
          totalCollections += amount
          
          switch (transaction.payment_method) {
            case 'cash':
              cashCollections += amount
              break
            case 'card':
              cardCollections += amount
              break
            case 'upi':
              upiCollections += amount
              break
            case 'bank_transfer':
              bankTransferCollections += amount
              break
          }
        })
      })

      // Get room occupancy data
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('status', 'occupied')

      const totalRooms = 50 // Assuming 50 total rooms
      const occupiedRooms = rooms?.length || 0
      const occupancyPercentage = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
      const averageRoomRate = occupiedRooms > 0 ? roomRevenue / occupiedRooms : 0

      settlementRecords.push({
        id: `settlement-${date.toISOString().split('T')[0]}`,
        date: date.toISOString().split('T')[0],
        total_revenue: totalRevenue,
        room_revenue: roomRevenue,
        service_revenue: serviceRevenue,
        advance_collections: advanceCollections,
        outstanding_amount: outstandingAmount,
        cash_collections: cashCollections,
        card_collections: cardCollections,
        upi_collections: upiCollections,
        bank_transfer_collections: bankTransferCollections,
        total_collections: totalCollections,
        occupancy_percentage: occupancyPercentage,
        average_room_rate: averageRoomRate,
        total_rooms: totalRooms,
        occupied_rooms: occupiedRooms
      })
    }

    // Calculate summary
    const totalRevenue = settlementRecords.reduce((sum, r) => sum + r.total_revenue, 0)
    const totalCollections = settlementRecords.reduce((sum, r) => sum + r.total_collections, 0)
    const totalOutstanding = settlementRecords.reduce((sum, r) => sum + r.outstanding_amount, 0)
    const averageOccupancy = settlementRecords.length > 0 
      ? settlementRecords.reduce((sum, r) => sum + r.occupancy_percentage, 0) / settlementRecords.length 
      : 0

    const response = {
      total: settlementRecords.length,
      data: settlementRecords,
      summary: {
        total_revenue: totalRevenue,
        total_collections: totalCollections,
        total_outstanding: totalOutstanding,
        average_occupancy: averageOccupancy,
        period: `${fromDate} to ${toDate}`
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in day-settlement API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}