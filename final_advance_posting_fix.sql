-- FINAL FIX: Stop database from overriding frontend calculations
-- The issue: Advance posting triggers are changing the total amount from ₹6,672 to ₹4,800

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

-- Step 2: DROP ALL TRIGGERS THAT CAN OVERRIDE TOTAL AMOUNTS
DROP TRIGGER IF EXISTS trg_charge_items_update_bpb ON public.charge_items CASCADE;
DROP TRIGGER IF EXISTS trg_charge_items_safe ON public.charge_items CASCADE;
DROP TRIGGER IF EXISTS trg_charge_items_simple ON public.charge_items CASCADE;
DROP TRIGGER IF EXISTS trg_payment_transactions_update_bpb ON public.payment_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_payment_transactions_safe ON public.payment_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_payment_transactions_simple ON public.payment_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_calculate_booking_taxes ON public.booking_payment_breakdown CASCADE;
DROP TRIGGER IF EXISTS trg_bpb_after_change ON public.charge_items CASCADE;
DROP TRIGGER IF EXISTS trg_bpb_after_change ON public.payment_transactions CASCADE;

-- Step 3: DROP ALL FUNCTIONS THAT CAN OVERRIDE TOTAL AMOUNTS
DROP FUNCTION IF EXISTS public.recompute_booking_payment_breakdown(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.trg_bpb_after_change() CASCADE;
DROP FUNCTION IF EXISTS public.trg_charge_items_safe() CASCADE;
DROP FUNCTION IF EXISTS public.trg_payment_transactions_safe() CASCADE;
DROP FUNCTION IF EXISTS public.trg_charge_items_simple() CASCADE;
DROP FUNCTION IF EXISTS public.trg_payment_transactions_simple() CASCADE;
DROP FUNCTION IF EXISTS public.update_payment_breakdown_safe(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_payment_breakdown_simple(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_booking_taxes(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_calculate_booking_taxes() CASCADE;

-- Step 4: Create a SAFE function that ONLY updates outstanding amounts
CREATE OR REPLACE FUNCTION public.update_outstanding_only(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_amount numeric(10,2) := 0;
    v_advance_total numeric(10,2) := 0;
    v_receipt_total numeric(10,2) := 0;
    v_outstanding_amount numeric(10,2) := 0;
BEGIN
    -- Get current total_amount (DO NOT CHANGE IT)
    SELECT 
        total_amount,
        COALESCE(advance_cash, 0) + COALESCE(advance_card, 0) + COALESCE(advance_upi, 0) + COALESCE(advance_bank, 0),
        COALESCE(receipt_cash, 0) + COALESCE(receipt_card, 0) + COALESCE(receipt_upi, 0) + COALESCE(receipt_bank, 0)
    INTO v_total_amount, v_advance_total, v_receipt_total
    FROM public.booking_payment_breakdown
    WHERE booking_id = p_booking_id;
    
    -- Calculate outstanding amount (DO NOT CHANGE total_amount)
    v_outstanding_amount := GREATEST(0, v_total_amount - v_advance_total - v_receipt_total);
    
    -- Update ONLY outstanding_amount (DO NOT TOUCH total_amount or taxed_total_amount)
    UPDATE public.booking_payment_breakdown
    SET 
        outstanding_amount = v_outstanding_amount,
        updated_at = now()
    WHERE booking_id = p_booking_id;
END;
$$;

-- Step 5: Create SAFE triggers that ONLY update outstanding amounts
CREATE OR REPLACE FUNCTION public.trg_update_outstanding_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only update outstanding amount, NEVER touch total_amount
    PERFORM public.update_outstanding_only(COALESCE(NEW.booking_id, OLD.booking_id));
    RETURN NULL;
END;
$$;

-- Step 6: Create new SAFE triggers (drop existing ones first)
DROP TRIGGER IF EXISTS trg_payment_transactions_outstanding_only ON public.payment_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_charge_items_outstanding_only ON public.charge_items CASCADE;

CREATE TRIGGER trg_payment_transactions_outstanding_only
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.trg_update_outstanding_only();

CREATE TRIGGER trg_charge_items_outstanding_only
    AFTER INSERT OR UPDATE OR DELETE ON public.charge_items
    FOR EACH ROW EXECUTE FUNCTION public.trg_update_outstanding_only();

-- Step 7: Fix the specific booking that was changed from ₹6,672 to ₹4,800
-- First, let's see what the correct amount should be
SELECT 
    b.id as booking_id,
    b.created_at,
    bpb.total_amount as current_total,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as correct_total,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance
FROM public.bookings b
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
LEFT JOIN public.charge_items ci ON ci.booking_id = b.id
WHERE bpb.total_amount IS NOT NULL AND bpb.total_amount > 0
GROUP BY b.id, b.created_at, bpb.total_amount, bpb.advance_cash, bpb.advance_card, bpb.advance_upi, bpb.advance_bank
ORDER BY b.created_at DESC
LIMIT 5;

-- Step 8: Fix all bookings to have correct total amounts
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
    updated_at = now()
WHERE bpb.booking_id IN (
    SELECT DISTINCT booking_id FROM public.booking_payment_breakdown
);

-- Step 9: Update outstanding amounts for all bookings
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN SELECT DISTINCT booking_id FROM public.booking_payment_breakdown LOOP
        PERFORM public.update_outstanding_only(rec.booking_id);
    END LOOP;
END $$;

-- Step 10: Verify the fix
SELECT 
    b.id as booking_id,
    b.created_at,
    bpb.total_amount as new_total,
    bpb.outstanding_amount as new_outstanding,
    COALESCE(SUM(br.room_total), 0) as room_total,
    COALESCE(SUM(ci.total_amount), 0) as charges_total,
    (COALESCE(SUM(br.room_total), 0) + COALESCE(SUM(ci.total_amount), 0)) as expected_total,
    (bpb.advance_cash + bpb.advance_card + bpb.advance_upi + bpb.advance_bank) as total_advance,
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
         bpb.advance_cash, bpb.advance_card, bpb.advance_upi, bpb.advance_bank
ORDER BY b.created_at DESC
LIMIT 5;
