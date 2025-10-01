-- COMPREHENSIVE FIX: Room Booking Amount + Charges
-- The issue: Total Booking should show (Room Amount + Charges) but it's only showing charges

-- Step 1: Check current state
SELECT 
    b.id as booking_id,
    bpb.total_amount as current_total,
    bpb.taxed_total_amount as current_taxed_total,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as expected_total
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE ci.id IS NOT NULL  -- Only bookings with charges
GROUP BY b.id, bpb.total_amount, bpb.taxed_total_amount
ORDER BY b.created_at DESC
LIMIT 5;

-- Step 2: Fix all bookings to show Room Amount + Charges
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
    outstanding_amount = GREATEST(0, 
        COALESCE((
            SELECT SUM(br.room_total) 
            FROM public.booking_rooms br 
            WHERE br.booking_id = bpb.booking_id
        ), 0) + COALESCE((
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

-- Step 3: Also fix bookings without charges to ensure they show room amount
UPDATE public.booking_payment_breakdown bpb
SET 
    total_amount = COALESCE((
        SELECT SUM(br.room_total) 
        FROM public.booking_rooms br 
        WHERE br.booking_id = bpb.booking_id
    ), 0),
    taxed_total_amount = COALESCE((
        SELECT SUM(br.room_total) 
        FROM public.booking_rooms br 
        WHERE br.booking_id = bpb.booking_id
    ), 0),
    outstanding_amount = GREATEST(0, 
        COALESCE((
            SELECT SUM(br.room_total) 
            FROM public.booking_rooms br 
            WHERE br.booking_id = bpb.booking_id
        ), 0) - 
        (COALESCE(bpb.advance_cash,0) + COALESCE(bpb.advance_card,0) + COALESCE(bpb.advance_upi,0) + COALESCE(bpb.advance_bank,0)) -
        (COALESCE(bpb.receipt_cash,0) + COALESCE(bpb.receipt_card,0) + COALESCE(bpb.receipt_upi,0) + COALESCE(bpb.receipt_bank,0))
    ),
    updated_at = now()
WHERE bpb.booking_id NOT IN (
    SELECT DISTINCT ci.booking_id 
    FROM public.charge_items ci 
    WHERE ci.booking_id IS NOT NULL
);

-- Step 4: Verify the fix
SELECT 
    b.id as booking_id,
    bpb.total_amount as total_booking,
    bpb.taxed_total_amount as taxed_total,
    bpb.outstanding_amount as outstanding,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as expected_total,
    CASE 
        WHEN bpb.taxed_total_amount = (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE bpb.taxed_total_amount > 0
GROUP BY b.id, bpb.total_amount, bpb.taxed_total_amount, bpb.outstanding_amount
ORDER BY b.created_at DESC
LIMIT 5;
