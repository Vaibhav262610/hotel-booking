-- Fix checkout triggers and implement proper single room checkout functionality
-- This migration addresses the "record 'new' has no field 'check_out'" error
-- and ensures proper single room checkout with booking status management

-- 1) Drop the problematic trigger that references the old check_out field
DROP TRIGGER IF EXISTS trg_update_guest_stats_on_checkout ON public.bookings CASCADE;
DROP FUNCTION IF EXISTS public.update_guest_stats_on_checkout() CASCADE;

-- 2) Create a new function that works with the new schema
CREATE OR REPLACE FUNCTION public.update_guest_stats_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update guest statistics when a booking is completed
  -- This trigger now works with the new schema where checkout info is in booking_rooms
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    -- Get the latest checkout date from booking_rooms
    DECLARE
      latest_checkout_date date;
      latest_checkin_date date;
    BEGIN
      SELECT 
        MAX(br.actual_check_out)::date,
        MIN(br.actual_check_in)::date
      INTO latest_checkout_date, latest_checkin_date
      FROM public.booking_rooms br
      WHERE br.booking_id = NEW.id
        AND br.actual_check_out IS NOT NULL;
      
      -- Update guest statistics
      UPDATE guests 
      SET 
        total_stays = total_stays + 1,
        total_spent = total_spent + COALESCE(
          (SELECT total_amount FROM booking_payment_breakdown WHERE booking_id = NEW.id), 
          0
        ),
        last_stay_date = latest_checkout_date
      WHERE id = NEW.guest_id;
      
      -- Insert visit record for each room in the booking
      INSERT INTO guest_visits (
        guest_id, 
        booking_id, 
        check_in_date, 
        check_out_date, 
        room_type,
        total_amount
      )
      SELECT 
        NEW.guest_id,
        NEW.id,
        latest_checkin_date,
        latest_checkout_date,
        rt.name,
        COALESCE(
          (SELECT total_amount FROM booking_payment_breakdown WHERE booking_id = NEW.id), 
          0
        )
      FROM public.booking_rooms br
      JOIN public.rooms r ON br.room_id = r.id
      JOIN public.room_types rt ON r.room_type_id = rt.id
      WHERE br.booking_id = NEW.id
      LIMIT 1; -- Only insert one visit record per booking
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3) Recreate the trigger with the fixed function
CREATE TRIGGER trg_update_guest_stats_on_checkout
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_stats_on_checkout();

-- 4) Enhance the booking status update function to handle single room checkout properly
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
  v_room_count integer;
BEGIN
  -- Get the booking_id from the changed row
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  
  -- Get total room count and status counts for this booking
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE room_status = 'checked_out'),
    COUNT(*) FILTER (WHERE room_status = 'checked_in') > 0,
    COUNT(*) FILTER (WHERE room_status = 'reserved') > 0,
    COUNT(*) FILTER (WHERE room_status = 'cancelled') > 0
  INTO v_room_count, v_all_checked_out, v_any_checked_in, v_any_reserved, v_any_cancelled
  FROM public.booking_rooms
  WHERE booking_id = v_booking_id;
  
  -- Determine the new booking status based on room statuses
  IF v_room_count = 0 THEN
    -- No rooms in booking, keep current status
    RETURN COALESCE(NEW, OLD);
  ELSIF v_all_checked_out = v_room_count THEN
    -- All rooms are checked out
    v_new_status := 'checked_out';
  ELSIF v_any_checked_in THEN
    -- At least one room is checked in
    v_new_status := 'checked_in';
  ELSIF v_any_cancelled THEN
    -- At least one room is cancelled
    v_new_status := 'cancelled';
  ELSIF v_any_reserved THEN
    -- At least one room is reserved
    v_new_status := 'confirmed';
  ELSE
    -- Default fallback
    v_new_status := 'confirmed';
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

-- 5) Create a function to handle single room checkout with proper validation
CREATE OR REPLACE FUNCTION public.checkout_single_room(
  p_booking_id uuid,
  p_room_id uuid,
  p_actual_checkout timestamptz,
  p_staff_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_room record;
  v_booking record;
  v_result json;
BEGIN
  -- Get the booking room details
  SELECT br.*, b.status as booking_status, b.booking_number
  INTO v_booking_room
  FROM public.booking_rooms br
  JOIN public.bookings b ON br.booking_id = b.id
  WHERE br.booking_id = p_booking_id 
    AND br.room_id = p_room_id;
  
  -- Validate the booking room exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking room not found'
    );
  END IF;
  
  -- Validate the room can be checked out
  IF NOT (v_booking_room.room_status IN ('reserved', 'checked_in')) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Room cannot be checked out. Current status: ' || v_booking_room.room_status
    );
  END IF;
  
  -- Update the booking room
  UPDATE public.booking_rooms
  SET 
    room_status = 'checked_out',
    actual_check_out = p_actual_checkout,
    updated_at = now()
  WHERE booking_id = p_booking_id 
    AND room_id = p_room_id;
  
  -- Update the room status to available
  UPDATE public.rooms
  SET 
    status = 'available',
    updated_at = now()
  WHERE id = p_room_id;
  
  -- Create housekeeping task
  INSERT INTO public.housekeeping_tasks (
    room_id,
    task_type,
    status,
    notes,
    priority,
    created_at,
    due_by
  ) VALUES (
    p_room_id,
    'checkout_cleaning',
    'pending',
    'Room needs cleaning after checkout. Booking: ' || v_booking_room.booking_number,
    'high',
    now(),
    now() + INTERVAL '1 hour'
  );
  
  -- Log the action if staff_id is provided
  IF p_staff_id IS NOT NULL THEN
    INSERT INTO public.staff_logs (
      hotel_id,
      staff_id,
      action,
      details,
      created_at
    ) VALUES (
      (SELECT hotel_id FROM public.bookings WHERE id = p_booking_id),
      p_staff_id,
      'ROOM_CHECKOUT',
      json_build_object(
        'booking_id', p_booking_id,
        'booking_number', v_booking_room.booking_number,
        'room_id', p_room_id,
        'actual_checkout', p_actual_checkout
      )::text,
      now()
    );
  END IF;
  
  -- Return success result
  RETURN json_build_object(
    'success', true,
    'message', 'Room checked out successfully',
    'booking_id', p_booking_id,
    'room_id', p_room_id,
    'actual_checkout', p_actual_checkout
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- 6) Add comments for documentation
COMMENT ON FUNCTION public.update_guest_stats_on_checkout() IS 'Updates guest statistics when a booking is marked as checked out. Works with the new schema using booking_rooms table.';
COMMENT ON FUNCTION public.update_booking_status_from_rooms() IS 'Updates booking status based on the status of all rooms in the booking. Ensures booking is only marked as checked_out when all rooms are checked out.';
COMMENT ON FUNCTION public.checkout_single_room(uuid, uuid, timestamptz, uuid) IS 'Handles single room checkout with proper validation and status updates. Returns JSON result with success/error information.';
