alter table "public"."checkout_notifications" drop constraint "checkout_notifications_notification_type_check";

alter table "public"."bookings" add column "meal_plan" character varying(10) default 'EP'::character varying;

alter table "public"."bookings" add column "plan_name" character varying(20) default 'STD'::character varying;

alter table "public"."bookings" add column "purpose" character varying(255);

alter table "public"."bookings" add column "total_pax" integer default 0;

alter table "public"."bookings" add constraint "bookings_meal_plan_check" CHECK (((meal_plan)::text = ANY ((ARRAY['CP'::character varying, 'MAP'::character varying, 'EP'::character varying])::text[]))) not valid;

alter table "public"."bookings" validate constraint "bookings_meal_plan_check";

alter table "public"."bookings" add constraint "bookings_total_pax_non_negative" CHECK ((total_pax >= 0)) not valid;

alter table "public"."bookings" validate constraint "bookings_total_pax_non_negative";

alter table "public"."checkout_notifications" add constraint "checkout_notifications_notification_type_check" CHECK (((notification_type)::text = ANY ((ARRAY['approaching'::character varying, 'overdue'::character varying, 'grace_period'::character varying, 'late_charges'::character varying])::text[]))) not valid;

alter table "public"."checkout_notifications" validate constraint "checkout_notifications_notification_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.compute_total_pax()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Compute total_pax when any pax field changes
  NEW.total_pax := COALESCE(NEW.number_of_guests, 0) + 
                   COALESCE(NEW.extra_guests, 0) + 
                   COALESCE(NEW.child_guests, 0);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_payment_transaction(p_booking_id uuid, p_amount numeric, p_payment_method character varying, p_transaction_type character varying, p_collected_by uuid DEFAULT NULL::uuid, p_reference_number character varying DEFAULT NULL::character varying, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    transaction_id UUID;
BEGIN
    -- Insert payment transaction
    INSERT INTO payment_transactions (
        booking_id,
        amount,
        payment_method,
        transaction_type,
        collected_by,
        reference_number,
        notes
    ) VALUES (
        p_booking_id,
        p_amount,
        p_payment_method,
        p_transaction_type,
        p_collected_by,
        p_reference_number,
        p_notes
    ) RETURNING id INTO transaction_id;
    
    -- Update booking advance_amount if it's an advance or remaining payment
    IF p_transaction_type IN ('advance', 'remaining') THEN
        UPDATE bookings 
        SET advance_amount = advance_amount + p_amount
        WHERE id = p_booking_id;
    END IF;
    
    -- Log the payment collection
    IF p_collected_by IS NOT NULL THEN
        INSERT INTO staff_logs (
            hotel_id,
            staff_id,
            action,
            details,
            ip_address
        ) VALUES (
            '550e8400-e29b-41d4-a716-446655440000',
            p_collected_by,
            'payment_collected',
            format('Collected %s payment of ₹%s via %s for booking %s', 
                   p_transaction_type, p_amount, p_payment_method, p_booking_id)
        );
    END IF;
    
    RETURN transaction_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_loyalty_points(amount numeric)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1 point per 100 currency units spent
    RETURN FLOOR(amount / 100);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_remaining_balance(booking_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_paid DECIMAL(10,2);
    final_amount DECIMAL(10,2);
BEGIN
    -- Get total amount paid
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payment_transactions 
    WHERE booking_id = booking_uuid 
    AND transaction_type IN ('advance', 'remaining', 'additional')
    AND status = 'completed';
    
    -- Get final amount from booking
    SELECT COALESCE(final_amount, total_amount) INTO final_amount
    FROM bookings 
    WHERE id = booking_uuid;
    
    RETURN GREATEST(0, final_amount - total_paid);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_checkout_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Archive notifications older than 30 days
    UPDATE checkout_notifications 
    SET is_active = false 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_active = true;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up old checkout notifications';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_checkout_statistics(start_date date DEFAULT (CURRENT_DATE - '7 days'::interval), end_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_notifications integer, approaching_count integer, overdue_count integer, grace_period_count integer, late_charges_count integer, total_late_fees numeric, average_grace_period_hours numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_notifications,
        COUNT(*) FILTER (WHERE cn.notification_type = 'approaching')::INTEGER as approaching_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'overdue')::INTEGER as overdue_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'grace_period')::INTEGER as grace_period_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'late_charges')::INTEGER as late_charges_count,
        COALESCE(SUM(lcc.late_checkout_fee), 0) as total_late_fees,
        COALESCE(
            AVG(
                EXTRACT(EPOCH FROM (gpt.grace_period_end - gpt.grace_period_start)) / 3600
            ), 0
        )::DECIMAL(5,2) as average_grace_period_hours
    FROM checkout_notifications cn
    LEFT JOIN late_checkout_charges lcc ON cn.booking_id = lcc.booking_id
    LEFT JOIN grace_period_tracker gpt ON cn.booking_id = gpt.booking_id
    WHERE cn.created_at::DATE BETWEEN start_date AND end_date;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_loyalty_tier(guest_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_points INTEGER;
    new_tier VARCHAR(20);
BEGIN
    SELECT points_earned - points_redeemed - points_expired INTO total_points
    FROM guest_loyalty 
    WHERE guest_id = guest_uuid;
    
    -- Determine tier based on points
    IF total_points >= 1000 THEN
        new_tier := 'platinum';
    ELSIF total_points >= 500 THEN
        new_tier := 'gold';
    ELSIF total_points >= 200 THEN
        new_tier := 'silver';
    ELSE
        new_tier := 'bronze';
    END IF;
    
    -- Update tier if changed
    UPDATE guest_loyalty 
    SET tier = new_tier, tier_upgrade_date = CURRENT_DATE
    WHERE guest_id = guest_uuid AND tier != new_tier;
END;
$function$
;

CREATE TRIGGER trg_compute_total_pax BEFORE INSERT OR UPDATE OF number_of_guests, extra_guests, child_guests ON public.bookings FOR EACH ROW EXECUTE FUNCTION compute_total_pax();


