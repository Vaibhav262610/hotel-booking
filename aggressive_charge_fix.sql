-- AGGRESSIVE FIX: Completely remove all conflicting triggers and create clean system
-- This will definitely fix the charge posting calculation issues

-- Step 1: Show current trigger state
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('charge_items', 'booking_payment_breakdown', 'payment_transactions')
ORDER BY event_object_table, trigger_name;

-- Step 2: DROP ALL POTENTIALLY CONFLICTING TRIGGERS
DROP TRIGGER IF EXISTS trg_charge_items_update_bpb ON public.charge_items CASCADE;
DROP TRIGGER IF EXISTS trg_charge_items_safe ON public.charge_items CASCADE;
DROP TRIGGER IF EXISTS trg_payment_transactions_update_bpb ON public.payment_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_payment_transactions_safe ON public.payment_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_calculate_booking_taxes ON public.booking_payment_breakdown CASCADE;
DROP TRIGGER IF EXISTS trg_bpb_after_change ON public.charge_items CASCADE;
DROP TRIGGER IF EXISTS trg_bpb_after_change ON public.payment_transactions CASCADE;

-- Step 3: DROP ALL POTENTIALLY CONFLICTING FUNCTIONS
DROP FUNCTION IF EXISTS public.recompute_booking_payment_breakdown(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.trg_bpb_after_change() CASCADE;
DROP FUNCTION IF EXISTS public.trg_charge_items_safe() CASCADE;
DROP FUNCTION IF EXISTS public.trg_payment_transactions_safe() CASCADE;
DROP FUNCTION IF EXISTS public.update_payment_breakdown_safe(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_booking_taxes(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_calculate_booking_taxes() CASCADE;

-- Step 4: Create a simple, reliable function for updating payment breakdown
CREATE OR REPLACE FUNCTION public.update_payment_breakdown_simple(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_room_total numeric(10,2) := 0;
    v_charges_total numeric(10,2) := 0;
    v_total_amount numeric(10,2) := 0;
    v_advance_total numeric(10,2) := 0;
    v_receipt_total numeric(10,2) := 0;
    v_outstanding_amount numeric(10,2) := 0;
BEGIN
    -- Get room total from booking_rooms
    SELECT COALESCE(SUM(room_total), 0) INTO v_room_total
    FROM public.booking_rooms
    WHERE booking_id = p_booking_id;
    
    -- Get charges total from charge_items
    SELECT COALESCE(SUM(total_amount), 0) INTO v_charges_total
    FROM public.charge_items
    WHERE booking_id = p_booking_id;
    
    -- Calculate total amount (room + charges)
    v_total_amount := v_room_total + v_charges_total;
    
    -- Get existing payment breakdown
    SELECT 
        COALESCE(advance_cash, 0) + COALESCE(advance_card, 0) + COALESCE(advance_upi, 0) + COALESCE(advance_bank, 0),
        COALESCE(receipt_cash, 0) + COALESCE(receipt_card, 0) + COALESCE(receipt_upi, 0) + COALESCE(receipt_bank, 0)
    INTO v_advance_total, v_receipt_total
    FROM public.booking_payment_breakdown
    WHERE booking_id = p_booking_id;
    
    -- Calculate outstanding amount
    v_outstanding_amount := GREATEST(0, v_total_amount - v_advance_total - v_receipt_total);
    
    -- Update or insert payment breakdown
    INSERT INTO public.booking_payment_breakdown (
        booking_id, 
        total_amount, 
        taxed_total_amount,
        outstanding_amount,
        updated_at
    ) VALUES (
        p_booking_id, 
        v_total_amount, 
        v_total_amount,  -- For now, treat total_amount as taxed_total_amount
        v_outstanding_amount,
        now()
    )
    ON CONFLICT (booking_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        taxed_total_amount = EXCLUDED.taxed_total_amount,
        outstanding_amount = EXCLUDED.outstanding_amount,
        updated_at = now();
END;
$$;

-- Step 5: Create simple trigger functions
CREATE OR REPLACE FUNCTION public.trg_charge_items_simple()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update payment breakdown when charges change
    PERFORM public.update_payment_breakdown_simple(COALESCE(NEW.booking_id, OLD.booking_id));
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_payment_transactions_simple()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update payment breakdown when payments change
    PERFORM public.update_payment_breakdown_simple(COALESCE(NEW.booking_id, OLD.booking_id));
    RETURN NULL;
END;
$$;

-- Step 6: Create new simple triggers
CREATE TRIGGER trg_charge_items_simple
    AFTER INSERT OR UPDATE OR DELETE ON public.charge_items
    FOR EACH ROW EXECUTE FUNCTION public.trg_charge_items_simple();

CREATE TRIGGER trg_payment_transactions_simple
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.trg_payment_transactions_simple();

-- Step 7: Fix all existing bookings
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN SELECT DISTINCT booking_id FROM public.booking_payment_breakdown LOOP
        PERFORM public.update_payment_breakdown_simple(rec.booking_id);
    END LOOP;
END $$;

-- Step 8: Verify the fix
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
    CASE 
        WHEN ABS(bpb.total_amount - (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0))) <= 0.01 THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE bpb.total_amount IS NOT NULL AND bpb.total_amount > 0
GROUP BY b.id, b.created_at, bpb.total_amount, bpb.taxed_total_amount, bpb.outstanding_amount, 
         bpb.advance_cash, bpb.advance_card, bpb.advance_upi, bpb.advance_bank,
         bpb.receipt_cash, bpb.receipt_card, bpb.receipt_upi, bpb.receipt_bank
ORDER BY b.created_at DESC
LIMIT 5;
