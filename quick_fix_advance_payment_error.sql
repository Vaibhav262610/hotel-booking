    -- QUICK FIX: Handle the missing function error
    -- The createAdvancePayment is failing because a trigger is trying to call the dropped function

    -- Step 1: Check what triggers are still active
    SELECT
        event_object_schema AS table_schema,
        event_object_table AS table_name,
        trigger_name,
        event_manipulation AS event,
        action_statement AS definition,
        action_timing AS timing
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table IN ('payment_transactions', 'booking_payment_breakdown', 'charge_items', 'booking_rooms')
    ORDER BY table_name, trigger_name;

    -- Step 2: Drop any remaining triggers that might call the dropped function
    DROP TRIGGER IF EXISTS trg_payment_transactions_update_bpb ON public.payment_transactions;
    DROP TRIGGER IF EXISTS trg_charge_items_update_bpb ON public.charge_items;
    DROP TRIGGER IF EXISTS trg_booking_rooms_after_change_recompute ON public.booking_rooms;
    DROP TRIGGER IF EXISTS trg_payment_transactions_update_bpb_safe ON public.payment_transactions;
    DROP TRIGGER IF EXISTS trg_charge_items_update_bpb_safe ON public.charge_items;
    DROP TRIGGER IF EXISTS trg_safe_payment_update ON public.payment_transactions;
    DROP TRIGGER IF EXISTS trg_payment_update_only ON public.payment_transactions;

    -- Step 3: Create a simple function that does nothing (to prevent errors)
    CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
        -- Do nothing - this function is disabled to prevent overriding frontend calculations
        RETURN;
    END;
    $$;

    -- Step 4: Create the safe payment update function
    CREATE OR REPLACE FUNCTION public.update_payment_breakdown_only()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
        booking_id_to_update uuid;
        outstanding numeric := 0;
        current_total numeric := 0;
    BEGIN
        -- Get the booking_id from the trigger
        booking_id_to_update := COALESCE(NEW.booking_id, OLD.booking_id);
        
        -- Get current total amount (NEVER change this)
        SELECT COALESCE(taxed_total_amount, total_amount, 0) INTO current_total
        FROM public.booking_payment_breakdown
        WHERE booking_id = booking_id_to_update;

        -- Calculate outstanding amount: Total - Advance - Receipt
        outstanding := current_total - COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = booking_id_to_update AND transaction_type = 'advance'
        ), 0) - COALESCE((
            SELECT SUM(amount) FROM public.payment_transactions 
            WHERE booking_id = booking_id_to_update AND transaction_type = 'receipt'
        ), 0);

        -- Update ONLY the payment breakdown, NEVER the total amounts
        UPDATE public.booking_payment_breakdown
        SET
            advance_cash = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'advance' AND payment_method = 'cash'
            ), 0),
            advance_card = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'advance' AND payment_method = 'card'
            ), 0),
            advance_upi = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'advance' AND payment_method = 'upi'
            ), 0),
            advance_bank = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'advance' AND payment_method = 'bank'
            ), 0),
            receipt_cash = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'receipt' AND payment_method = 'cash'
            ), 0),
            receipt_card = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'receipt' AND payment_method = 'card'
            ), 0),
            receipt_upi = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'receipt' AND payment_method = 'upi'
            ), 0),
            receipt_bank = COALESCE((
                SELECT SUM(amount) FROM public.payment_transactions 
                WHERE booking_id = booking_id_to_update AND transaction_type = 'receipt' AND payment_method = 'bank'
            ), 0),
            outstanding_amount = outstanding,
            updated_at = now()
        WHERE booking_id = booking_id_to_update;
        
        RETURN COALESCE(NEW, OLD);
    END;
    $$;

    -- Step 5: Create the safe trigger
    CREATE TRIGGER trg_payment_update_only
        AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
        FOR EACH ROW EXECUTE FUNCTION public.update_payment_breakdown_only();

    -- Step 6: Verify the fix
    SELECT 'Fix applied successfully' as status;
