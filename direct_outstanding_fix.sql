-- Direct fix for the outstanding amount calculation issue
-- The problem is that outstanding_amount is not matching the total_amount

-- First, let's see what's happening with the specific booking
SELECT 
    b.id,
    b.created_at,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    br.room_total,
    br.room_rate,
    br.expected_nights
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
WHERE bpb.taxed_total_amount = 5972.82
ORDER BY b.created_at DESC
LIMIT 3;

-- The issue is likely that the outstanding_amount is being calculated from a different source
-- Let's fix this by ensuring outstanding_amount = taxed_total_amount - advance - receipt

-- Simple fix: Update all outstanding_amount to match the correct calculation
UPDATE public.booking_payment_breakdown
SET outstanding_amount = (
    COALESCE(taxed_total_amount, total_amount, 0) - 
    COALESCE(advance_cash, 0) - 
    COALESCE(advance_card, 0) - 
    COALESCE(advance_upi, 0) - 
    COALESCE(advance_bank, 0) - 
    COALESCE(receipt_cash, 0) - 
    COALESCE(receipt_card, 0) - 
    COALESCE(receipt_upi, 0) - 
    COALESCE(receipt_bank, 0)
),
updated_at = now()
WHERE outstanding_amount != (
    COALESCE(taxed_total_amount, total_amount, 0) - 
    COALESCE(advance_cash, 0) - 
    COALESCE(advance_card, 0) - 
    COALESCE(advance_upi, 0) - 
    COALESCE(advance_bank, 0) - 
    COALESCE(receipt_cash, 0) - 
    COALESCE(receipt_card, 0) - 
    COALESCE(receipt_upi, 0) - 
    COALESCE(receipt_bank, 0)
);

-- Verify the fix
SELECT 
    b.id,
    bpb.taxed_total_amount as total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) as calculated_outstanding,
    CASE 
        WHEN bpb.outstanding_amount = (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) THEN 'CORRECT'
        ELSE 'INCORRECT - DIFFERENCE: ' || (bpb.outstanding_amount - (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)))
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
WHERE bpb.taxed_total_amount IS NOT NULL AND bpb.taxed_total_amount > 0
ORDER BY b.created_at DESC
LIMIT 10;
