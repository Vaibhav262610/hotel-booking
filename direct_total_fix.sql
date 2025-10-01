-- DIRECT FIX: Force correct total_amount calculation including charges
-- The issue: total_amount is not including charges, it's only showing outstanding + advance

-- Step 1: Show the problem clearly
SELECT 
    b.id as booking_id,
    b.created_at,
    bpb.total_amount as current_total,
    bpb.outstanding_amount as current_outstanding,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as correct_total,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    CASE 
        WHEN bpb.total_amount = (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE bpb.total_amount IS NOT NULL AND bpb.total_amount > 0
GROUP BY b.id, b.created_at, bpb.total_amount, bpb.outstanding_amount, 
         bpb.advance_cash, bpb.advance_card, bpb.advance_upi, bpb.advance_bank,
         bpb.receipt_cash, bpb.receipt_card, bpb.receipt_upi, bpb.receipt_bank
ORDER BY b.created_at DESC
LIMIT 5;

-- Step 2: DIRECT UPDATE - Force correct total_amount for all bookings
UPDATE public.booking_payment_breakdown bpb
SET 
    total_amount = (
        SELECT COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)
        FROM public.booking_rooms br
        LEFT JOIN public.charge_items ci ON ci.booking_id = br.booking_id
        WHERE br.booking_id = bpb.booking_id
    ),
    taxed_total_amount = (
        SELECT COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)
        FROM public.booking_rooms br
        LEFT JOIN public.charge_items ci ON ci.booking_id = br.booking_id
        WHERE br.booking_id = bpb.booking_id
    ),
    outstanding_amount = (
        SELECT COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)
        FROM public.booking_rooms br
        LEFT JOIN public.charge_items ci ON ci.booking_id = br.booking_id
        WHERE br.booking_id = bpb.booking_id
    ) - (
        COALESCE(bpb.advance_cash, 0) + COALESCE(bpb.advance_card, 0) + 
        COALESCE(bpb.advance_upi, 0) + COALESCE(bpb.advance_bank, 0) +
        COALESCE(bpb.receipt_cash, 0) + COALESCE(bpb.receipt_card, 0) + 
        COALESCE(bpb.receipt_upi, 0) + COALESCE(bpb.receipt_bank, 0)
    ),
    updated_at = now()
WHERE bpb.booking_id IN (
    SELECT DISTINCT booking_id FROM public.booking_payment_breakdown
);

-- Step 3: Verify the fix
SELECT 
    b.id as booking_id,
    b.created_at,
    bpb.total_amount as new_total,
    bpb.outstanding_amount as new_outstanding,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as expected_total,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    CASE 
        WHEN ABS(bpb.total_amount - (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0))) <= 0.01 THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE bpb.total_amount IS NOT NULL AND bpb.total_amount > 0
GROUP BY b.id, b.created_at, bpb.total_amount, bpb.outstanding_amount, 
         bpb.advance_cash, bpb.advance_card, bpb.advance_upi, bpb.advance_bank,
         bpb.receipt_cash, bpb.receipt_card, bpb.receipt_upi, bpb.receipt_bank
ORDER BY b.created_at DESC
LIMIT 5;
