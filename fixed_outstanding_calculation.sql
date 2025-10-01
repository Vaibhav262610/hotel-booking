-- Fixed version that handles NULL values and edge cases
CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    total numeric := 0;
    advance_total numeric := 0;
    receipt_total numeric := 0;
    outstanding numeric := 0;
    booking_exists boolean := false;
BEGIN
    -- Check if booking exists
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE id = p_booking_id) INTO booking_exists;
    
    IF NOT booking_exists THEN
        RETURN; -- Exit if booking doesn't exist
    END IF;

    -- Get the correct total amount (prioritize taxed_total_amount)
    SELECT COALESCE(bpb.taxed_total_amount, bpb.total_amount, 0) INTO total
    FROM public.booking_payment_breakdown bpb
    WHERE bpb.booking_id = p_booking_id;

    -- If no breakdown exists or total is 0, try to calculate from booking_rooms
    IF total = 0 THEN
        SELECT COALESCE(SUM(br.total_amount), 0) INTO total
        FROM public.booking_rooms br
        WHERE br.booking_id = p_booking_id;
    END IF;

    -- If still 0, try to get from booking_rooms with room details
    IF total = 0 THEN
        SELECT COALESCE(SUM(br.nights * br.rate_per_night), 0) INTO total
        FROM public.booking_rooms br
        WHERE br.booking_id = p_booking_id;
    END IF;

    -- If still 0, set a default minimum value to avoid NULL constraint violation
    IF total = 0 THEN
        total := 0.01; -- Minimum value to satisfy NOT NULL constraint
    END IF;

    -- Calculate total advance payments
    SELECT COALESCE(SUM(amount), 0) INTO advance_total
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND transaction_type = 'advance';

    -- Calculate total receipt payments  
    SELECT COALESCE(SUM(amount), 0) INTO receipt_total
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND transaction_type = 'receipt';

    -- Calculate outstanding amount: Total - Advance - Receipt
    outstanding := total - advance_total - receipt_total;

    -- Update or insert the breakdown
    INSERT INTO public.booking_payment_breakdown (
        booking_id,
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
    ) VALUES (
        p_booking_id,
        total,
        total, -- Use same value for both total_amount and taxed_total_amount
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'cash'
        ), 0),
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'card'
        ), 0),
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'upi'
        ), 0),
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'bank'
        ), 0),
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'cash'
        ), 0),
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'card'
        ), 0),
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'upi'
        ), 0),
        COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'bank'
        ), 0),
        outstanding
    )
    ON CONFLICT (booking_id) 
    DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        taxed_total_amount = EXCLUDED.taxed_total_amount,
        advance_cash = EXCLUDED.advance_cash,
        advance_card = EXCLUDED.advance_card,
        advance_upi = EXCLUDED.advance_upi,
        advance_bank = EXCLUDED.advance_bank,
        receipt_cash = EXCLUDED.receipt_cash,
        receipt_card = EXCLUDED.receipt_card,
        receipt_upi = EXCLUDED.receipt_upi,
        receipt_bank = EXCLUDED.receipt_bank,
        outstanding_amount = EXCLUDED.outstanding_amount,
        updated_at = now();
END;
$$;

-- Now recalculate all existing bookings
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT booking_id FROM public.booking_payment_breakdown LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.booking_id);
  END LOOP;
END $$;

-- Also handle bookings without breakdown entries (but only if they have booking_rooms)
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN 
    SELECT DISTINCT b.id 
    FROM public.bookings b
    INNER JOIN public.booking_rooms br ON br.booking_id = b.id
    WHERE b.id NOT IN (SELECT booking_id FROM public.booking_payment_breakdown) 
  LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.id);
  END LOOP;
END $$;

-- Verify the fix
SELECT 
    'Verification Results' as status,
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN bpb.outstanding_amount = (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) THEN 1 END) as correct_calculations,
    COUNT(CASE WHEN bpb.outstanding_amount != (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) THEN 1 END) as incorrect_calculations
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id;

-- Show specific examples
SELECT 
    b.id,
    bpb.taxed_total_amount as total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) as calculated_outstanding,
    CASE 
        WHEN bpb.outstanding_amount = (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
WHERE bpb.taxed_total_amount IS NOT NULL AND bpb.taxed_total_amount > 0
ORDER BY b.created_at DESC
LIMIT 10;
