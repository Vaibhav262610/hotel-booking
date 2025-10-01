import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Convert DD/MM/YYYY to YYYY-MM-DD for database queries
function convertDateFormat(dateStr: string): string {
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Fetch check-in data - includes ALL bookings with check-in activity in the date range
async function fetchCheckinData(startDate: string, endDate: string) {
  // Query 1: Get records with actual_check_in in date range
  const { data: actualCheckinData, error: actualError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      actual_check_in,
      check_in,
      arrival_type,
      advance_amount,
      status,
      guests:guest_id(name, phone),
      rooms:room_id(number, type),
      hotels:hotel_id(name),
      staff:staff_id(name)
    `)
    .gte('actual_check_in::date', startDate)
    .lte('actual_check_in::date', endDate)
    .not('actual_check_in', 'is', null)

  if (actualError) throw actualError

  // Query 2: Get records with check_in in date range (but no actual_check_in)
  const { data: scheduledCheckinData, error: scheduledError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      actual_check_in,
      check_in,
      arrival_type,
      advance_amount,
      status,
      guests:guest_id(name, phone),
      rooms:room_id(number, type),
      hotels:hotel_id(name),
      staff:staff_id(name)
    `)
    .gte('check_in::date', startDate)
    .lte('check_in::date', endDate)
    .is('actual_check_in', null)

  if (scheduledError) throw scheduledError

  // Combine both datasets
  const allData = [...(actualCheckinData || []), ...(scheduledCheckinData || [])]
  
  // Sort by check-in time (actual first, then scheduled)
  allData.sort((a, b) => {
    const timeA = a.actual_check_in || a.check_in
    const timeB = b.actual_check_in || b.check_in
    return new Date(timeB).getTime() - new Date(timeA).getTime()
  })

  return allData.map(record => ({
    id: record.id,
    booking_number: record.booking_number,
    checkin_time: record.actual_check_in || record.check_in,
    arrival_type: record.arrival_type,
    advance_amount: record.advance_amount || 0,
    status: record.status,
    guest_name: record.guests?.name || 'N/A',
    guest_phone: record.guests?.phone || 'N/A',
    room_number: record.rooms?.number || 'N/A',
    room_type: record.rooms?.type || 'N/A',
    hotel_name: record.hotels?.name || 'N/A',
    staff_name: record.staff?.name || 'N/A'
  }))
}

// Fetch check-out data - includes ALL bookings with check-out activity in the date range
async function fetchCheckoutData(startDate: string, endDate: string) {
  // Query 1: Get records with actual_check_out in date range
  const { data: actualCheckoutData, error: actualError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      actual_check_out,
      check_out,
      final_amount,
      total_amount,
      remaining_balance_payment_method,
      payment_method,
      price_adjustment,
      checkout_notes,
      status,
      guests:guest_id(name, phone),
      rooms:room_id(number, type),
      hotels:hotel_id(name),
      staff:staff_id(name)
    `)
    .gte('actual_check_out::date', startDate)
    .lte('actual_check_out::date', endDate)
    .not('actual_check_out', 'is', null)

  if (actualError) throw actualError

  // Query 2: Get records with check_out in date range (but no actual_check_out)
  const { data: scheduledCheckoutData, error: scheduledError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      actual_check_out,
      check_out,
      final_amount,
      total_amount,
      remaining_balance_payment_method,
      payment_method,
      price_adjustment,
      checkout_notes,
      status,
      guests:guest_id(name, phone),
      rooms:room_id(number, type),
      hotels:hotel_id(name),
      staff:staff_id(name)
    `)
    .gte('expected_checkout::date', startDate)
    .lte('expected_checkout::date', endDate)
    .is('actual_check_out', null)

  if (scheduledError) throw scheduledError

  // Combine both datasets
  const allData = [...(actualCheckoutData || []), ...(scheduledCheckoutData || [])]
  
  // Sort by check-out time (actual first, then scheduled)
  allData.sort((a, b) => {
    const timeA = a.actual_check_out || a.expected_checkout
    const timeB = b.actual_check_out || b.expected_checkout
    return new Date(timeB).getTime() - new Date(timeA).getTime()
  })

  return allData.map(record => ({
    id: record.id,
    booking_number: record.booking_number,
    checkout_time: record.actual_check_out || record.expected_checkout,
    full_payment: record.final_amount || record.total_amount || 0,
    payment_method: record.remaining_balance_payment_method || record.payment_method || 'N/A',
    price_adjustment: record.price_adjustment || 0,
    checkout_notes: record.checkout_notes || '',
    status: record.status,
    guest_name: record.guests?.name || 'N/A',
    guest_phone: record.guests?.phone || 'N/A',
    room_number: record.rooms?.number || 'N/A',
    room_type: record.rooms?.type || 'N/A',
    hotel_name: record.hotels?.name || 'N/A',
    staff_name: record.staff?.name || 'N/A'
  }))
}

// Generate HTML report with proper formatting
function generateHTMLReport(checkinData: any[], checkoutData: any[], fromDate: string, toDate: string): string {
  const currentDate = new Date().toLocaleString('en-IN')
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotel Check-in/Check-out Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #333;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #666;
            margin: 5px 0;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            background: #333;
            color: white;
            padding: 15px;
            margin: 0 0 20px 0;
            font-size: 20px;
            font-weight: bold;
            border-radius: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 14px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #333;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
            border-left: 4px solid #333;
        }
        .summary h3 {
            margin-top: 0;
            color: #333;
        }
        .summary-item {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .summary-item:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 16px;
            color: #333;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
        .no-data {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hotel Check-in/Check-out Report</h1>
            <p>Report Period: ${fromDate} to ${toDate}</p>
            <p>Generated on: ${currentDate}</p>
        </div>

        <div class="section">
            <h2 class="section-title">Check-in Report (${checkinData.length} records)</h2>
            ${checkinData.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Booking Number</th>
                        <th>Check-in Time</th>
                        <th>Guest Name</th>
                        <th>Phone</th>
                        <th>Room Number</th>
                        <th>Room Type</th>
                        <th>Arrival Type</th>
                        <th>Advance Payment</th>
                        <th>Staff Name</th>
                    </tr>
                </thead>
                <tbody>
                    ${checkinData.map((record, index) => {
                      const checkinTime = record.checkin_time ? new Date(record.checkin_time).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }).replace(/\//g, '-') : 'N/A'
                      
                      return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${record.booking_number}</td>
                            <td>${checkinTime}</td>
                            <td>${record.guest_name}</td>
                            <td>${record.guest_phone}</td>
                            <td>${record.room_number}</td>
                            <td>${record.room_type}</td>
                            <td>${record.arrival_type || 'N/A'}</td>
                            <td>₹${record.advance_amount || 0}</td>
                            <td>${record.staff_name}</td>
                        </tr>
                      `
                    }).join('')}
                </tbody>
            </table>
            ` : '<div class="no-data">No check-in records found for the selected period.</div>'}
        </div>

        <div class="section">
            <h2 class="section-title">Check-out Report (${checkoutData.length} records)</h2>
            ${checkoutData.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Booking Number</th>
                        <th>Check-out Time</th>
                        <th>Guest Name</th>
                        <th>Phone</th>
                        <th>Room Number</th>
                        <th>Room Type</th>
                        <th>Full Payment</th>
                        <th>Payment Method</th>
                        <th>Price Adjustment</th>
                        <th>Notes</th>
                        <th>Staff Name</th>
                    </tr>
                </thead>
                <tbody>
                    ${checkoutData.map((record, index) => {
                      const checkoutTime = record.checkout_time ? new Date(record.checkout_time).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }).replace(/\//g, '-') : 'N/A'
                      
                      const priceAdjustment = record.price_adjustment ? `₹${record.price_adjustment}` : '₹0'
                      
                      return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${record.booking_number}</td>
                            <td>${checkoutTime}</td>
                            <td>${record.guest_name}</td>
                            <td>${record.guest_phone}</td>
                            <td>${record.room_number}</td>
                            <td>${record.room_type}</td>
                            <td>₹${record.full_payment || 0}</td>
                            <td>${record.payment_method || 'N/A'}</td>
                            <td>${priceAdjustment}</td>
                            <td>${record.checkout_notes || ''}</td>
                            <td>${record.staff_name}</td>
                        </tr>
                      `
                    }).join('')}
                </tbody>
            </table>
            ` : '<div class="no-data">No check-out records found for the selected period.</div>'}
        </div>

        <div class="summary">
            <h3>Summary Report</h3>
            <div class="summary-item">
                <span>Total Check-ins:</span>
                <span>${checkinData.length}</span>
            </div>
            <div class="summary-item">
                <span>Total Check-outs:</span>
                <span>${checkoutData.length}</span>
            </div>
            <div class="summary-item">
                <span>Total Advance Payments:</span>
                <span>₹${checkinData.reduce((sum, record) => sum + (record.advance_amount || 0), 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-item">
                <span>Total Full Payments:</span>
                <span>₹${checkoutData.reduce((sum, record) => sum + (record.full_payment || 0), 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-item">
                <span>Total Price Adjustments:</span>
                <span>₹${checkoutData.reduce((sum, record) => sum + (record.price_adjustment || 0), 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-item">
                <span>Net Revenue:</span>
                <span>₹${(checkoutData.reduce((sum, record) => sum + (record.full_payment || 0), 0) + checkoutData.reduce((sum, record) => sum + (record.price_adjustment || 0), 0)).toLocaleString('en-IN')}</span>
            </div>
        </div>

        <div class="footer">
            <p>This report was generated automatically by the Hotel Management System</p>
        </div>
    </div>
</body>
</html>
  `
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate and toDate parameters are required' },
        { status: 400 }
      )
    }

    // Convert date format from DD/MM/YYYY to YYYY-MM-DD
    const startDate = convertDateFormat(fromDate)
    const endDate = convertDateFormat(toDate)

    // Validate date range
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use DD/MM/YYYY format' },
        { status: 400 }
      )
    }
    
    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: 'fromDate cannot be after toDate' },
        { status: 400 }
      )
    }

    // Fetch both check-in and check-out data
    const [checkinData, checkoutData] = await Promise.all([
      fetchCheckinData(startDate, endDate),
      fetchCheckoutData(startDate, endDate)
    ])

    // Generate HTML report
    const htmlContent = generateHTMLReport(checkinData, checkoutData, fromDate, toDate)
    
    // Generate filename with date range
    const filename = `checkin-checkout-report-${fromDate.replace(/\//g, '-')}-to-${toDate.replace(/\//g, '-')}.html`

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    })

  } catch (error) {
    console.error('Error in checkin-checkout HTML export API:', error)
    return NextResponse.json(
      { error: 'Failed to export report data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
