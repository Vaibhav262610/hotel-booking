-- PERMANENT FIX: Disable the database function from overriding frontend calculations
-- This will prevent the recompute_booking_payment_breakdown function from changing amounts

-- Step 1: Drop the trigger that calls the function
DROP TRIGGER IF EXISTS trg_payment_transactions_update_bpb ON public.payment_transactions;
DROP TRIGGER IF EXISTS trg_charge_items_update_bpb ON public.charge_items;
DROP TRIGGER IF EXISTS trg_booking_rooms_after_change_recompute ON public.booking_rooms;

-- Step 2: Create a simple function that only updates payment breakdowns without changing totals
CREATE OR REPLACE FUNCTION public.update_payment_breakdown_only(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    advance_total numeric := 0;
    receipt_total numeric := 0;
    outstanding numeric := 0;
    current_total numeric := 0;
BEGIN
    -- Get current total amount (don't change it)
    SELECT COALESCE(taxed_total_amount, total_amount, 0) INTO current_total
    FROM public.booking_payment_breakdown
    WHERE booking_id = p_booking_id;

    -- Calculate total advance payments
    SELECT COALESCE(SUM(amount), 0) INTO advance_total
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND transaction_type = 'advance';

    -- Calculate total receipt payments  
    SELECT COALESCE(SUM(amount), 0) INTO receipt_total
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND transaction_type = 'receipt';

    -- Calculate outstanding amount: Total - Advance - Receipt
    outstanding := current_total - advance_total - receipt_total;

    -- Update ONLY the payment breakdown, NOT the total amounts
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

-- Step 3: Create new triggers that use the safe function
CREATE TRIGGER trg_payment_transactions_update_bpb_safe
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_payment_breakdown_only(COALESCE(NEW.booking_id, OLD.booking_id));

CREATE TRIGGER trg_charge_items_update_bpb_safe
    AFTER INSERT OR UPDATE OR DELETE ON public.charge_items
    FOR EACH ROW EXECUTE FUNCTION public.update_payment_breakdown_only(COALESCE(NEW.booking_id, OLD.booking_id));

-- Step 4: Fix all existing bookings with incorrect amounts
UPDATE public.booking_payment_breakdown
SET 
    outstanding_amount = COALESCE(taxed_total_amount, total_amount, 0) - 
    COALESCE(advance_cash, 0) - COALESCE(advance_card, 0) - COALESCE(advance_upi, 0) - COALESCE(advance_bank, 0) - 
    COALESCE(receipt_cash, 0) - COALESCE(receipt_card, 0) - COALESCE(receipt_upi, 0) - COALESCE(receipt_bank, 0),
    updated_at = now()
WHERE outstanding_amount != (
    COALESCE(taxed_total_amount, total_amount, 0) - 
    COALESCE(advance_cash, 0) - COALESCE(advance_card, 0) - COALESCE(advance_upi, 0) - COALESCE(advance_bank, 0) - 
    COALESCE(receipt_cash, 0) - COALESCE(receipt_card, 0) - COALESCE(receipt_upi, 0) - COALESCE(receipt_bank, 0)
);

-- Step 5: Verify the fix
SELECT 
    b.id,
    bpb.taxed_total_amount as total_amount,
    bpb.outstanding_amount,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
    (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank) as total_receipt,
    CASE 
        WHEN bpb.outstanding_amount = (bpb.taxed_total_amount - (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) - (bpb.receipt_cash + bpb.receipt_card + bpb.receipt_upi + bpb.receipt_bank)) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
WHERE bpb.taxed_total_amount IS NOT NULL AND bpb.taxed_total_amount > 0
ORDER BY b.created_at DESC
LIMIT 10;
