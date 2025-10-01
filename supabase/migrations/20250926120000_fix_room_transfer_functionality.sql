-- Fix room transfer functionality to ensure all tables are properly updated
-- This migration addresses issues with room transfers and ensures data consistency

-- 1) Create a comprehensive room transfer function that handles all table updates
CREATE OR REPLACE FUNCTION public.process_room_transfer(
  p_booking_id uuid,
  p_from_room_id uuid,
  p_to_room_id uuid,
  p_reason text,
  p_transfer_staff_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking record;
  v_source_booking_room record;
  v_source_room record;
  v_target_room record;
  v_transfer_record record;
  v_booking_room_id uuid;
  v_hotel_id uuid;
  v_guest_name text;
  v_source_room_number text;
  v_target_room_number text;
  v_result json;
BEGIN
  -- 1) Validate and get booking details
  SELECT b.*, g.name as guest_name, h.id as hotel_id
  INTO v_booking
  FROM public.bookings b
  JOIN public.guests g ON b.guest_id = g.id
  JOIN public.hotels h ON b.hotel_id = h.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;
  
  -- 2) Validate booking status
  IF NOT (v_booking.status IN ('confirmed', 'checked_in')) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot transfer booking with status: ' || v_booking.status
    );
  END IF;
  
  -- 3) Find the specific booking_rooms record for the source room
  SELECT br.*
  INTO v_source_booking_room
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id 
    AND br.room_id = p_from_room_id;
    
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Source room is not associated with this booking'
    );
  END IF;
  
  v_booking_room_id := v_source_booking_room.id;
  
  -- 4) Get source and target room details
  SELECT r.*, rt.name as room_type_name
  INTO v_source_room
  FROM public.rooms r
  JOIN public.room_types rt ON r.room_type_id = rt.id
  WHERE r.id = p_from_room_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Source room not found'
    );
  END IF;
  
  SELECT r.*, rt.name as room_type_name
  INTO v_target_room
  FROM public.rooms r
  JOIN public.room_types rt ON r.room_type_id = rt.id
  WHERE r.id = p_to_room_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Target room not found'
    );
  END IF;
  
  -- 5) Validate transfer conditions
  IF p_from_room_id = p_to_room_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Source and target rooms cannot be the same'
    );
  END IF;
  
  IF v_target_room.status != 'available' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Target room is not available (Status: ' || v_target_room.status || ')'
    );
  END IF;
  
  -- 6) Check for conflicting bookings on target room
  IF EXISTS (
    SELECT 1 FROM public.booking_rooms br
    WHERE br.room_id = p_to_room_id
      AND br.room_status IN ('reserved', 'checked_in')
      AND br.check_in_date <= v_source_booking_room.check_out_date
      AND br.check_out_date >= v_source_booking_room.check_in_date
      AND br.id != v_booking_room_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Target room has conflicting bookings for the requested dates'
    );
  END IF;
  
  -- 7) Update booking_rooms record (triggers will handle room status and staff assignment)
  UPDATE public.booking_rooms
  SET 
    room_id = p_to_room_id,
    updated_at = now()
  WHERE id = v_booking_room_id;
  
  -- 8) Create room transfer record (triggers will handle staff assignment)
  INSERT INTO public.room_transfers (
    booking_id,
    from_room_id,
    to_room_id,
    transfer_date,
    reason,
    checked_in_staff_id,
    transfer_staff_id
  ) VALUES (
    p_booking_id,
    p_from_room_id,
    p_to_room_id,
    now(),
    p_reason,
    v_booking.staff_id,
    COALESCE(p_transfer_staff_id, v_booking.staff_id)
  ) RETURNING * INTO v_transfer_record;
  
  -- 9) Update active_stays if they exist
  UPDATE public.active_stays
  SET 
    room_id = p_to_room_id,
    updated_at = now()
  WHERE booking_id = p_booking_id 
    AND room_id = p_from_room_id;
  
  -- 10) Log the transfer action
  INSERT INTO public.staff_logs (
    hotel_id,
    staff_id,
    action,
    details,
    created_at
  ) VALUES (
    v_hotel_id,
    COALESCE(p_transfer_staff_id, v_booking.staff_id),
    'ROOM_TRANSFER',
    json_build_object(
      'booking_id', p_booking_id,
      'booking_number', v_booking.booking_number,
      'guest_name', v_booking.guest_name,
      'from_room', v_source_room.number,
      'to_room', v_target_room.number,
      'reason', p_reason,
      'transfer_id', v_transfer_record.id
    )::text,
    now()
  );
  
  -- 11) Update room availability metrics if the function exists
  BEGIN
    PERFORM public.update_room_availability_metrics(
      v_target_room.room_type_id,
      CURRENT_DATE::text
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore if function doesn't exist
      NULL;
  END;
  
  -- 12) Return success result
  RETURN json_build_object(
    'success', true,
    'message', 'Room transfer completed successfully',
    'transferId', v_transfer_record.id,
    'booking_id', p_booking_id,
    'from_room', v_source_room.number,
    'to_room', v_target_room.number,
    'guest_name', v_booking.guest_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transfer failed: ' || SQLERRM
    );
END;
$$;

-- 2) Create a function to get available rooms for transfer with proper validation
CREATE OR REPLACE FUNCTION public.get_available_rooms_for_transfer(
  p_booking_id uuid,
  p_exclude_room_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  number text,
  room_type_id uuid,
  name text,
  code text,
  base_price numeric,
  status text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_room record;
  v_room record;
BEGIN
  -- Get booking details
  SELECT br.*
  INTO v_booking_room
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Return available rooms of the same type
  RETURN QUERY
  SELECT 
    r.id,
    r.number,
    r.room_type_id,
    rt.name,
    rt.code,
    rt.base_price,
    r.status
  FROM public.rooms r
  JOIN public.room_types rt ON r.room_type_id = rt.id
  WHERE r.room_type_id = (SELECT room_type_id FROM public.rooms WHERE id = v_booking_room.room_id)
    AND r.status = 'available'
    AND (p_exclude_room_id IS NULL OR r.id != p_exclude_room_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_rooms br2
      WHERE br2.room_id = r.id
        AND br2.room_status IN ('reserved', 'checked_in')
        AND br2.check_in_date <= v_booking_room.check_out_date
        AND br2.check_out_date >= v_booking_room.check_in_date
        AND br2.id != v_booking_room.id
    )
  ORDER BY r.number;
END;
$$;

-- 3) Create a function to get transfer history for a booking
CREATE OR REPLACE FUNCTION public.get_room_transfer_history(p_booking_id uuid)
RETURNS TABLE(
  transfer_id uuid,
  transfer_date timestamptz,
  reason text,
  from_room_number text,
  to_room_number text,
  transfer_staff_name text,
  checked_in_staff_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id as transfer_id,
    rt.transfer_date,
    rt.reason,
    fr.number as from_room_number,
    tr.number as to_room_number,
    ts.name as transfer_staff_name,
    cs.name as checked_in_staff_name
  FROM public.room_transfers rt
  JOIN public.rooms fr ON rt.from_room_id = fr.id
  JOIN public.rooms tr ON rt.to_room_id = tr.id
  LEFT JOIN public.staff ts ON rt.transfer_staff_id = ts.id
  LEFT JOIN public.staff cs ON rt.checked_in_staff_id = cs.id
  WHERE rt.booking_id = p_booking_id
  ORDER BY rt.transfer_date DESC;
END;
$$;

-- 4) Add comments for documentation
COMMENT ON FUNCTION public.process_room_transfer(uuid, uuid, uuid, text, uuid) IS 'Comprehensive room transfer function that updates all necessary tables and maintains data consistency';
COMMENT ON FUNCTION public.get_available_rooms_for_transfer(uuid, uuid) IS 'Returns available rooms for transfer, excluding rooms with conflicting bookings';
COMMENT ON FUNCTION public.get_room_transfer_history(uuid) IS 'Returns transfer history for a specific booking';

-- 5) Log the enhancement
INSERT INTO public.staff_logs (
  hotel_id,
  staff_id,
  action,
  details,
  created_at
) VALUES (
  (SELECT id FROM public.hotels LIMIT 1),
  NULL,
  'SYSTEM_MAINTENANCE',
  'Enhanced room transfer functionality with comprehensive table updates and validation',
  now()
) ON CONFLICT DO NOTHING;
