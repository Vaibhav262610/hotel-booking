-- Comprehensive cleanup of all old triggers and functions that reference check_out field
-- This migration ensures all old conflicting triggers are removed

-- 1) Drop ALL triggers that might be causing conflicts
DROP TRIGGER IF EXISTS trg_compute_booking_nights ON public.bookings CASCADE;
DROP TRIGGER IF EXISTS trg_update_booking_status ON public.bookings CASCADE;
DROP TRIGGER IF EXISTS trg_booking_rooms_availability_update ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_booking_rooms_occupancy_metrics ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_booking_rooms_channel_summary ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_booking_rooms_active_stays ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_booking_rooms_sync_room_status ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_sync_actual_checkin_from_booking_rooms ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_booking_rooms_before_ins_upd_normalize ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_booking_rooms_after_change_recompute ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_sync_actual_checkout_from_booking_rooms ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_update_booking_status_from_rooms ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_calculate_actual_nights ON public.booking_rooms CASCADE;
DROP TRIGGER IF EXISTS trg_calculate_planned_nights ON public.booking_rooms CASCADE;

-- 2) Drop ALL functions that might be causing conflicts
DROP FUNCTION IF EXISTS public.compute_booking_nights() CASCADE;
DROP FUNCTION IF EXISTS public.update_booking_status() CASCADE;
DROP FUNCTION IF EXISTS public.update_room_availability_realtime() CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_occupancy_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.update_channel_summary() CASCADE;
DROP FUNCTION IF EXISTS public.update_active_stays() CASCADE;
DROP FUNCTION IF EXISTS public.sync_actual_checkout_from_booking_rooms() CASCADE;
DROP FUNCTION IF EXISTS public.update_booking_status_from_rooms() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_actual_nights() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_planned_nights() CASCADE;

-- 3) Recreate ONLY the essential checkout functions (without availability system)
CREATE OR REPLACE FUNCTION public.sync_actual_checkout_from_booking_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the booking's actual_check_out to the latest actual_check_out from booking_rooms
  UPDATE public.bookings
  SET actual_check_out = (
    SELECT MAX(br.actual_check_out)
    FROM public.booking_rooms br
    WHERE br.booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
      AND br.actual_check_out IS NOT NULL
  )
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_booking_status_from_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id uuid;
  v_all_checked_out boolean;
  v_any_checked_in boolean;
  v_any_reserved boolean;
  v_any_cancelled boolean;
  v_new_status text;
BEGIN
  -- Get the booking_id from the changed row
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  
  -- Check the status of all rooms in this booking
  SELECT 
    COUNT(*) = COUNT(*) FILTER (WHERE room_status = 'checked_out'),
    COUNT(*) FILTER (WHERE room_status = 'checked_in') > 0,
    COUNT(*) FILTER (WHERE room_status = 'reserved') > 0,
    COUNT(*) FILTER (WHERE room_status = 'cancelled') > 0
  INTO v_all_checked_out, v_any_checked_in, v_any_reserved, v_any_cancelled
  FROM public.booking_rooms
  WHERE booking_id = v_booking_id;
  
  -- Determine the new booking status
  IF v_all_checked_out THEN
    v_new_status := 'checked_out';
  ELSIF v_any_checked_in THEN
    v_new_status := 'checked_in';
  ELSIF v_any_cancelled THEN
    v_new_status := 'cancelled';
  ELSIF v_any_reserved THEN
    v_new_status := 'confirmed';
  ELSE
    v_new_status := 'confirmed'; -- Default fallback
  END IF;
  
  -- Update the booking status
  UPDATE public.bookings
  SET 
    status = v_new_status,
    updated_at = now()
  WHERE id = v_booking_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_actual_nights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id uuid;
  v_actual_check_in timestamptz;
  v_actual_check_out timestamptz;
  v_actual_nights integer;
BEGIN
  -- Get the booking_id from the changed row
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  
  -- Get the earliest actual_check_in and latest actual_check_out
  SELECT 
    MIN(br.actual_check_in),
    MAX(br.actual_check_out)
  INTO v_actual_check_in, v_actual_check_out
  FROM public.booking_rooms br
  WHERE br.booking_id = v_booking_id
    AND br.actual_check_in IS NOT NULL
    AND br.actual_check_out IS NOT NULL;
  
  -- Calculate actual nights if both dates are available
  IF v_actual_check_in IS NOT NULL AND v_actual_check_out IS NOT NULL THEN
    v_actual_nights := GREATEST(1, CEIL((v_actual_check_out::date - v_actual_check_in::date) + 1));
    
    -- Update the booking with calculated actual_nights
    UPDATE public.bookings
    SET 
      actual_nights = v_actual_nights,
      updated_at = now()
    WHERE id = v_booking_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_planned_nights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id uuid;
  v_planned_nights integer;
BEGIN
  -- Get the booking_id from the changed row
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  
  -- Calculate planned nights from the earliest check_in_date and latest check_out_date
  SELECT GREATEST(1, CEIL((MAX(br.check_out_date)::date - MIN(br.check_in_date)::date) + 1))
  INTO v_planned_nights
  FROM public.booking_rooms br
  WHERE br.booking_id = v_booking_id;
  
  -- Update the booking with calculated planned_nights
  UPDATE public.bookings
  SET 
    planned_nights = v_planned_nights,
    updated_at = now()
  WHERE id = v_booking_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Create ONLY the essential triggers for checkout functionality
CREATE TRIGGER trg_sync_actual_checkout_from_booking_rooms
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_actual_checkout_from_booking_rooms();

CREATE TRIGGER trg_update_booking_status_from_rooms
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_status_from_rooms();

CREATE TRIGGER trg_calculate_actual_nights
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_actual_nights();

CREATE TRIGGER trg_calculate_planned_nights
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_planned_nights();

-- 5) Add comments
COMMENT ON FUNCTION public.sync_actual_checkout_from_booking_rooms() IS 'Syncs actual_check_out in bookings table with the latest actual_check_out from booking_rooms for that booking';
COMMENT ON FUNCTION public.update_booking_status_from_rooms() IS 'Updates booking status based on the status of all rooms in the booking';
COMMENT ON FUNCTION public.calculate_actual_nights() IS 'Calculates and updates actual_nights based on actual check-in and check-out times';
COMMENT ON FUNCTION public.calculate_planned_nights() IS 'Calculates and updates planned_nights based on scheduled check-in and check-out dates';
