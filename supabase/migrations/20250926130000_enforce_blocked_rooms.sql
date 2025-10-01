-- Enforce blocked-room rules across booking, transfers, and status sync

-- 1) Helper: is room blocked for a date range?
CREATE OR REPLACE FUNCTION public.is_room_blocked_for(
  p_room_id uuid,
  p_from date,
  p_to date
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.blocked_rooms b
    WHERE b.room_id = p_room_id
      AND b.is_active = true
      AND (
        (b.blocked_from_date <= p_from AND b.blocked_to_date > p_from) OR
        (b.blocked_from_date < p_to AND b.blocked_to_date >= p_to) OR
        (b.blocked_from_date >= p_from AND b.blocked_to_date <= p_to)
      )
  );
END;
$$;

-- 2) Update compute_room_status_for to prioritize blocked rooms
CREATE OR REPLACE FUNCTION public.compute_room_status_for(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_room_id IS NULL THEN
    RETURN 'available';
  END IF;

  -- Blocked takes precedence
  IF EXISTS (
    SELECT 1 FROM public.blocked_rooms b
    WHERE b.room_id = p_room_id
      AND b.is_active = true
      AND b.blocked_from_date <= CURRENT_DATE
      AND b.blocked_to_date >= CURRENT_DATE
  ) THEN
    RETURN 'blocked';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_rooms br
    WHERE br.room_id = p_room_id
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
  ) THEN
    RETURN 'occupied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_rooms br
    WHERE br.room_id = p_room_id
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
  ) THEN
    RETURN 'reserved';
  END IF;

  RETURN 'available';
END;
$$;

-- 3) Trigger: prevent booking a blocked room (overlapping dates)
CREATE OR REPLACE FUNCTION public.prevent_booking_on_blocked_room()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_room_blocked_for(NEW.room_id, NEW.check_in_date, NEW.check_out_date) THEN
    RAISE EXCEPTION 'ROOM_BLOCKED: Room is blocked for the selected dates' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_rooms_prevent_blocked ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_prevent_blocked
  BEFORE INSERT OR UPDATE OF room_id, check_in_date, check_out_date ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_booking_on_blocked_room();

-- 4) Trigger: when blocked_rooms change, sync the room status using helper
CREATE OR REPLACE FUNCTION public.sync_room_status_from_blocked_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_room uuid;
BEGIN
  v_room := COALESCE(NEW.room_id, OLD.room_id);
  UPDATE public.rooms r
    SET status = public.compute_room_status_for(v_room),
        updated_at = now()
    WHERE r.id = v_room;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_blocked_rooms_sync_room_status ON public.blocked_rooms;
CREATE TRIGGER trg_blocked_rooms_sync_room_status
  AFTER INSERT OR UPDATE OR DELETE ON public.blocked_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_room_status_from_blocked_rooms();

-- 5) Update get_available_rooms_for_transfer to exclude blocked rooms in the date range
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
  SELECT br.* INTO v_booking_room
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

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
    AND r.status <> 'maintenance'
    AND (p_exclude_room_id IS NULL OR r.id <> p_exclude_room_id)
    AND NOT public.is_room_blocked_for(r.id, v_booking_room.check_in_date, v_booking_room.check_out_date)
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


