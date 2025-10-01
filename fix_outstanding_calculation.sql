-- Fix outstanding amount calculation in booking_payment_breakdown
-- This will ensure outstanding_amount is calculated correctly

-- First, let's check the current function
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'recompute_booking_payment_breakdown' 
AND routine_schema = 'public';

-- Update the function to properly calculate outstanding amount
CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    total numeric := 0;
    advance_total numeric := 0;
    receipt_total numeric := 0;
    outstanding numeric := 0;
BEGIN
    -- Get total from breakdown if present, otherwise fallback to 0
    -- Use taxed_total_amount if available, otherwise total_amount
    SELECT COALESCE(bpb.taxed_total_amount, bpb.total_amount, 0) INTO total
    FROM public.bookings b
    LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
    WHERE b.id = p_booking_id;

    -- Calculate total advance payments
    SELECT COALESCE(SUM(amount), 0) INTO advance_total
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND transaction_type = 'advance';

    -- Calculate total receipt payments
    SELECT COALESCE(SUM(amount), 0) INTO receipt_total
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND transaction_type = 'receipt';

    -- Calculate outstanding amount
    outstanding := total - advance_total - receipt_total;

    -- Update the breakdown
    UPDATE public.booking_payment_breakdown
    SET
        total_amount = COALESCE(total_amount, total),
        taxed_total_amount = COALESCE(taxed_total_amount, total),
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
        outstanding_amount = outstanding
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

-- Recalculate all existing bookings to fix current data
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT booking_id FROM public.booking_payment_breakdown LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.booking_id);
  END LOOP;
END $$;

-- Also recalculate for bookings that might not have breakdown entries
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT id FROM public.bookings WHERE id NOT IN (SELECT booking_id FROM public.booking_payment_breakdown) LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.id);
  END LOOP;
END $$;

-- Verify the fix by showing some examples
SELECT 
    b.id,
    bpb.total_amount,
    bpb.taxed_total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) as calculated_outstanding
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
ORDER BY b.created_at DESC
LIMIT 5;
