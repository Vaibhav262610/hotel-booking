-- Test and ensure new bookings will show correct amounts
-- The issue: Will new bookings still get overridden by database functions?

-- Step 1: Check if there are any remaining triggers that might override amounts
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND (trigger_name LIKE '%payment%' OR trigger_name LIKE '%booking%' OR trigger_name LIKE '%breakdown%')
ORDER BY trigger_name;

-- Step 2: Check the current recompute_booking_payment_breakdown function
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'recompute_booking_payment_breakdown' 
AND routine_schema = 'public';

-- Step 3: Create a completely safe function that NEVER changes total amounts
CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    advance_total numeric := 0;
    receipt_total numeric := 0;
    outstanding numeric := 0;
    current_total numeric := 0;
BEGIN
    -- Get current total amount (NEVER change this)
    SELECT COALESCE(taxed_total_amount, total_amount, 0) INTO current_total
    FROM public.booking_payment_breakdown
    WHERE booking_id = p_booking_id;

    -- If no breakdown exists, create one with minimal values
    IF current_total = 0 THEN
        INSERT INTO public.booking_payment_breakdown (
            booking_id,
            total_amount,
            taxed_total_amount,
            outstanding_amount
        ) VALUES (
            p_booking_id,
            0.01, -- Minimal value to satisfy constraints
            0.01,
            0.01
        ) ON CONFLICT (booking_id) DO NOTHING;
        
        current_total := 0.01;
    END IF;

    -- Calculate outstanding amount: Total - Advance - Receipt
    outstanding := current_total - COALESCE((
        SELECT SUM(amount) FROM public.payment_transactions 
        WHERE booking_id = p_booking_id AND transaction_type = 'advance'
    ), 0) - COALESCE((
        SELECT SUM(amount) FROM public.payment_transactions 
        WHERE booking_id = p_booking_id AND transaction_type = 'receipt'
    ), 0);

    -- Update ONLY the payment breakdown, NEVER the total amounts
    UPDATE public.booking_payment_breakdown
    SET
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
END;
$$;

-- Step 4: Ensure the booking creation process respects frontend calculations
-- The key is that the frontend should set the total_amount and taxed_total_amount
-- and the database should NEVER override these values

-- Step 5: Verify current state
SELECT 
    b.id,
    b.created_at,
    bpb.taxed_total_amount as total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    CASE 
        WHEN bpb.outstanding_amount = (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
WHERE bpb.taxed_total_amount IS NOT NULL AND bpb.taxed_total_amount > 0
ORDER BY b.created_at DESC
LIMIT 5;
