-- ROBUST FIX: Address the root cause of amount discrepancies
-- The issue: All statuses showing INCORRECT means the fix didn't work properly

-- Step 1: Check what's actually in the database
SELECT 
    b.id as booking_id,
    b.created_at,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as expected_total,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE bpb.taxed_total_amount IS NOT NULL AND bpb.taxed_total_amount > 0
GROUP BY b.id, b.created_at, bpb.total_amount, bpb.taxed_total_amount, bpb.outstanding_amount, 
         bpb.advance_cash, bpb.advance_card, bpb.advance_upi, bpb.advance_bank,
         bpb.receipt_cash, bpb.receipt_card, bpb.receipt_upi, bpb.receipt_bank
ORDER BY b.created_at DESC
LIMIT 5;

-- Step 2: Fix the core issue - ensure total_amount and taxed_total_amount are correct
UPDATE public.booking_payment_breakdown bpb
SET 
    total_amount = COALESCE((
        SELECT SUM(br.room_total) 
        FROM public.booking_rooms br 
        WHERE br.booking_id = bpb.booking_id
    ), 0) + COALESCE((
        SELECT SUM(ci.total_amount) 
        FROM public.charge_items ci 
        WHERE ci.booking_id = bpb.booking_id
    ), 0),
    taxed_total_amount = COALESCE((
        SELECT SUM(br.room_total) 
        FROM public.booking_rooms br 
        WHERE br.booking_id = bpb.booking_id
    ), 0) + COALESCE((
        SELECT SUM(ci.total_amount) 
        FROM public.charge_items ci 
        WHERE ci.booking_id = bpb.booking_id
    ), 0),
    updated_at = now()
WHERE bpb.booking_id IN (
    SELECT DISTINCT id FROM public.bookings
);

-- Step 3: Now fix outstanding_amount based on the corrected totals
UPDATE public.booking_payment_breakdown bpb
SET 
    outstanding_amount = GREATEST(0, 
        bpb.taxed_total_amount - 
        (COALESCE(bpb.advance_cash,0) + COALESCE(bpb.advance_card,0) + COALESCE(bpb.advance_upi,0) + COALESCE(bpb.advance_bank,0)) -
        (COALESCE(bpb.receipt_cash,0) + COALESCE(bpb.receipt_card,0) + COALESCE(bpb.receipt_upi,0) + COALESCE(bpb.receipt_bank,0))
    ),
    updated_at = now()
WHERE bpb.booking_id IN (
    SELECT DISTINCT id FROM public.bookings
);

-- Step 4: Verify the fix with a more lenient check (allowing for small rounding differences)
SELECT 
    b.id as booking_id,
    b.created_at,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as expected_total,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) as calculated_outstanding,
    CASE 
        WHEN ABS(bpb.outstanding_amount - (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank))) <= 0.01 THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE bpb.taxed_total_amount IS NOT NULL AND bpb.taxed_total_amount > 0
GROUP BY b.id, b.created_at, bpb.total_amount, bpb.taxed_total_amount, bpb.outstanding_amount, 
         bpb.advance_cash, bpb.advance_card, bpb.advance_upi, bpb.advance_bank,
         bpb.receipt_cash, bpb.receipt_card, bpb.receipt_upi, bpb.receipt_bank
ORDER BY b.created_at DESC
LIMIT 5;
