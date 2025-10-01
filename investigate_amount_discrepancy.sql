-- Let's investigate what's causing the amount discrepancy
-- Check if there are charge items or other calculations affecting the total

-- First, let's see what's in the booking_payment_breakdown for a recent booking
SELECT 
    b.id,
    b.created_at,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    bpb.total_tax_amount,
    bpb.price_adjustment,
    br.room_total,
    br.room_rate,
    br.expected_nights
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
WHERE bpb.taxed_total_amount = 9274.08
ORDER BY b.created_at DESC
LIMIT 3;

-- Check if there are charge items for this booking
SELECT 
    ci.*,
    p.name as product_name
FROM public.charge_items ci
LEFT JOIN public.products p ON p.id = ci.product_id
WHERE ci.booking_id IN (
    SELECT b.id 
    FROM public.bookings b
    LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
    WHERE bpb.taxed_total_amount = 9274.08
)
ORDER BY ci.created_at DESC;

-- Check the current recompute_booking_payment_breakdown function
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'recompute_booking_payment_breakdown' 
AND routine_schema = 'public';
