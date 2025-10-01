-- Fix boolean = integer comparison error in checkout functions
-- This migration fixes the "operator does not exist: boolean = integer" error

-- 1) Fix the update_booking_status_from_rooms function
CREATE OR REPLACE FUNCTION public.update_booking_status_from_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id uuid;
  v_checked_out_count integer;
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
  INTO v_room_count, v_checked_out_count, v_any_checked_in, v_any_reserved, v_any_cancelled
  FROM public.booking_rooms
  WHERE booking_id = v_booking_id;
  
  -- Determine the new booking status based on room statuses
  IF v_room_count = 0 THEN
    -- No rooms in booking, keep current status
    RETURN COALESCE(NEW, OLD);
  ELSIF v_checked_out_count = v_room_count THEN
    -- All rooms are checked out (integer = integer comparison)
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

-- 2) Fix the checkout_single_room function to handle errors better
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

-- 3) Add better error handling and logging
CREATE OR REPLACE FUNCTION public.log_checkout_error(
  p_booking_id uuid,
  p_room_id uuid,
  p_error_message text,
  p_staff_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log checkout errors for debugging
  INSERT INTO public.staff_logs (
    hotel_id,
    staff_id,
    action,
    details,
    created_at
  ) VALUES (
    (SELECT hotel_id FROM public.bookings WHERE id = p_booking_id),
    p_staff_id,
    'CHECKOUT_ERROR',
    json_build_object(
      'booking_id', p_booking_id,
      'room_id', p_room_id,
      'error_message', p_error_message,
      'timestamp', now()
    )::text,
    now()
  );
END;
$$;

-- 4) Add comments for documentation
COMMENT ON FUNCTION public.update_booking_status_from_rooms() IS 'Updates booking status based on room statuses. Fixed boolean=integer comparison error.';
COMMENT ON FUNCTION public.checkout_single_room(uuid, uuid, timestamptz, uuid) IS 'Handles single room checkout with proper error handling and validation.';
COMMENT ON FUNCTION public.log_checkout_error(uuid, uuid, text, uuid) IS 'Logs checkout errors for debugging purposes.';
