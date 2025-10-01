-- First, let's check what columns exist in booking_rooms table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'booking_rooms' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Now let's see the current state with correct column names
SELECT 
    b.id,
    b.created_at,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    br.nights,
    br.rate_per_night,
    (br.nights * br.rate_per_night) as calculated_room_total
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
WHERE bpb.taxed_total_amount = 3091.36
ORDER BY b.created_at DESC
LIMIT 3;

-- Fixed function that uses correct column names
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

    -- Get the correct total amount - prioritize taxed_total_amount from existing breakdown
    SELECT COALESCE(bpb.taxed_total_amount, bpb.total_amount, 0) INTO total
    FROM public.booking_payment_breakdown bpb
    WHERE bpb.booking_id = p_booking_id;

    -- If no breakdown exists or total is 0, calculate from booking_rooms
    IF total = 0 THEN
        SELECT COALESCE(SUM(br.nights * br.rate_per_night), 0) INTO total
        FROM public.booking_rooms br
        WHERE br.booking_id = p_booking_id;
    END IF;

    -- If still 0, set a default minimum value
    IF total = 0 THEN
        total := 0.01;
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

    -- Update the breakdown
    UPDATE public.booking_payment_breakdown
    SET
        total_amount = total,
        taxed_total_amount = total,
        advance_cash = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'cash'
        ), 0),
        advance_card = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'card'
        ), 0),
        advance_upi = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'upi'
        ), 0),
        advance_bank = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'advance' AND payment_method = 'bank'
        ), 0),
        receipt_cash = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'cash'
        ), 0),
        receipt_card = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'card'
        ), 0),
        receipt_upi = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'upi'
        ), 0),
        receipt_bank = COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = p_booking_id AND transaction_type = 'receipt' AND payment_method = 'bank'
        ), 0),
        outstanding_amount = outstanding,
        updated_at = now()
    WHERE booking_id = p_booking_id;

    -- If no breakdown exists, create one
    IF NOT FOUND THEN
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
            total,
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
        );
    END IF;
END;
$$;

-- Recalculate all existing bookings
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT booking_id FROM public.booking_payment_breakdown LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.booking_id);
  END LOOP;
END $$;

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
