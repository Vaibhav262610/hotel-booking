-- FIX CHARGE POSTING ISSUE
-- The problem: When adding charges, the Total Booking shows ₹0.00 instead of including the charges

-- Step 1: Check current state of bookings with charges
SELECT 
    b.id as booking_id,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    COALESCE(SUM(ci.total_amount), 0) as total_charges,
    (bpb.taxed_total_amount + COALESCE(SUM(ci.total_amount), 0)) as expected_total
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE ci.id IS NOT NULL  -- Only bookings with charges
GROUP BY b.id, bpb.total_amount, bpb.taxed_total_amount, bpb.outstanding_amount
ORDER BY b.created_at DESC
LIMIT 5;

-- Step 2: Fix bookings where total_amount is 0 but there are charges
UPDATE public.booking_payment_breakdown bpb
SET 
    total_amount = COALESCE(bpb.taxed_total_amount, 0) + COALESCE((
        SELECT SUM(ci.total_amount) 
        FROM public.charge_items ci 
        WHERE ci.booking_id = bpb.booking_id
    ), 0),
    taxed_total_amount = COALESCE(bpb.taxed_total_amount, 0) + COALESCE((
        SELECT SUM(ci.total_amount) 
        FROM public.charge_items ci 
        WHERE ci.booking_id = bpb.booking_id
    ), 0),
    outstanding_amount = GREATEST(0, 
        COALESCE(bpb.taxed_total_amount, 0) + COALESCE((
            SELECT SUM(ci.total_amount) 
            FROM public.charge_items ci 
            WHERE ci.booking_id = bpb.booking_id
        ), 0) - 
        (COALESCE(bpb.advance_cash,0) + COALESCE(bpb.advance_card,0) + COALESCE(bpb.advance_upi,0) + COALESCE(bpb.advance_bank,0)) -
        (COALESCE(bpb.receipt_cash,0) + COALESCE(bpb.receipt_card,0) + COALESCE(bpb.receipt_upi,0) + COALESCE(bpb.receipt_bank,0))
    ),
    updated_at = now()
WHERE bpb.booking_id IN (
    SELECT DISTINCT ci.booking_id 
    FROM public.charge_items ci 
    WHERE ci.booking_id IS NOT NULL
);

-- Step 3: Verify the fix
SELECT 
    b.id as booking_id,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    COALESCE(SUM(ci.total_amount), 0) as total_charges,
    (bpb.taxed_total_amount) as current_total,
    CASE 
        WHEN bpb.taxed_total_amount >= COALESCE(SUM(ci.total_amount), 0) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE ci.id IS NOT NULL  -- Only bookings with charges
GROUP BY b.id, bpb.total_amount, bpb.taxed_total_amount, bpb.outstanding_amount
ORDER BY b.created_at DESC
LIMIT 5;
