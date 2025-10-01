-- Fix checkout system to handle single room checkout and automatic booking status updates
-- This migration adds missing functions and triggers for proper checkout handling

-- 1) Create function to sync actual_check_out from booking_rooms to bookings
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

-- 2) Create function to update booking status based on room statuses
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

-- 3) Create function to calculate and update actual_nights
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

-- 4) Create function to calculate and update planned_nights during booking creation
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

-- 5) Create triggers for the new functions
DROP TRIGGER IF EXISTS trg_sync_actual_checkout_from_booking_rooms ON public.booking_rooms;
CREATE TRIGGER trg_sync_actual_checkout_from_booking_rooms
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_actual_checkout_from_booking_rooms();

DROP TRIGGER IF EXISTS trg_update_booking_status_from_rooms ON public.booking_rooms;
CREATE TRIGGER trg_update_booking_status_from_rooms
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_status_from_rooms();

DROP TRIGGER IF EXISTS trg_calculate_actual_nights ON public.booking_rooms;
CREATE TRIGGER trg_calculate_actual_nights
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_actual_nights();

DROP TRIGGER IF EXISTS trg_calculate_planned_nights ON public.booking_rooms;
CREATE TRIGGER trg_calculate_planned_nights
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_planned_nights();

-- 6) Backfill existing bookings with calculated values
UPDATE public.bookings
SET 
  planned_nights = (
    SELECT GREATEST(1, CEIL((MAX(br.check_out_date)::date - MIN(br.check_in_date)::date) + 1))
    FROM public.booking_rooms br
    WHERE br.booking_id = bookings.id
  ),
  actual_nights = (
    SELECT GREATEST(1, CEIL((MAX(br.actual_check_out)::date - MIN(br.actual_check_in)::date) + 1))
    FROM public.booking_rooms br
    WHERE br.booking_id = bookings.id
      AND br.actual_check_in IS NOT NULL
      AND br.actual_check_out IS NOT NULL
  ),
  actual_check_in = (
    SELECT MIN(br.actual_check_in)
    FROM public.booking_rooms br
    WHERE br.booking_id = bookings.id
      AND br.actual_check_in IS NOT NULL
  ),
  actual_check_out = (
    SELECT MAX(br.actual_check_out)
    FROM public.booking_rooms br
    WHERE br.booking_id = bookings.id
      AND br.actual_check_out IS NOT NULL
  )
WHERE id IN (
  SELECT DISTINCT booking_id 
  FROM public.booking_rooms
);

-- 7) Add comments explaining the functions
COMMENT ON FUNCTION public.sync_actual_checkout_from_booking_rooms() IS 'Syncs actual_check_out in bookings table with the latest actual_check_out from booking_rooms for that booking';
COMMENT ON FUNCTION public.update_booking_status_from_rooms() IS 'Updates booking status based on the status of all rooms in the booking';
COMMENT ON FUNCTION public.calculate_actual_nights() IS 'Calculates and updates actual_nights based on actual check-in and check-out times';
COMMENT ON FUNCTION public.calculate_planned_nights() IS 'Calculates and updates planned_nights based on scheduled check-in and check-out dates';
