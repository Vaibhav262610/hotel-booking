-- Ensure RPC result types match declared signatures for room transfer flows

-- 1) get_available_rooms_for_transfer: cast varchar/enums to text
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
BEGIN
  SELECT br.*
  INTO v_booking_room
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.number::text,
    r.room_type_id,
    rt.name::text,
    rt.code::text,
    rt.base_price,
    r.status::text
  FROM public.rooms r
  JOIN public.room_types rt ON r.room_type_id = rt.id
  WHERE r.room_type_id = (
          SELECT r2.room_type_id FROM public.rooms r2 WHERE r2.id = v_booking_room.room_id
        )
    AND r.status = 'available'
    AND (p_exclude_room_id IS NULL OR r.id <> p_exclude_room_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_rooms br2
      WHERE br2.room_id = r.id
        AND br2.room_status IN ('reserved', 'checked_in')
        AND br2.check_in_date <= v_booking_room.check_out_date
        AND br2.check_out_date >= v_booking_room.check_in_date
        AND br2.id <> v_booking_room.id
    )
  ORDER BY r.number;
END;
$$;

-- 2) get_room_transfer_history: cast room numbers and staff names to text
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
    fr.number::text as from_room_number,
    tr.number::text as to_room_number,
    COALESCE(ts.name, '')::text as transfer_staff_name,
    COALESCE(cs.name, '')::text as checked_in_staff_name
  FROM public.room_transfers rt
  JOIN public.rooms fr ON rt.from_room_id = fr.id
  JOIN public.rooms tr ON rt.to_room_id = tr.id
  LEFT JOIN public.staff ts ON rt.transfer_staff_id = ts.id
  LEFT JOIN public.staff cs ON rt.checked_in_staff_id = cs.id
  WHERE rt.booking_id = p_booking_id
  ORDER BY rt.transfer_date DESC;
END;
$$;


