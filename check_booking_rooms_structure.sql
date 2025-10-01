-- First, let's check what columns exist in booking_rooms table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'booking_rooms' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Let's also check what data is actually in the booking_rooms table
SELECT * FROM public.booking_rooms LIMIT 3;

-- Now let's see the current state with whatever columns exist
SELECT 
    b.id,
    b.created_at,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
WHERE bpb.taxed_total_amount = 3091.36
ORDER BY b.created_at DESC
LIMIT 3;
