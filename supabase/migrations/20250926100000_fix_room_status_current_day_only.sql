-- Fix room status to only show current day availability, not future reservations
-- This ensures that rooms with future reservations show as "available" until their check-in date

-- 1) Fix the room status synchronization function to only consider current day reservations
CREATE OR REPLACE FUNCTION public.sync_room_status_from_booking_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update room status based on booking_rooms - ONLY for current day
  UPDATE public.rooms 
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'occupied'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE  -- Only reserved if check-in is today or earlier
      AND br.check_out_date >= CURRENT_DATE -- And check-out is today or later
    ) THEN 'reserved'
    -- REMOVED: Future reservations should NOT make room show as reserved
    -- WHEN EXISTS (
    --   SELECT 1 FROM public.booking_rooms br 
    --   WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
    --   AND br.room_status = 'reserved'
    --   AND br.check_in_date > CURRENT_DATE  -- This was the problem!
    -- ) THEN 'reserved'
    ELSE 'available'
  END
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2) Fix the sync_all_room_status function to only consider current day reservations
CREATE OR REPLACE FUNCTION public.sync_all_room_status()
RETURNS void AS $$
BEGIN
  UPDATE public.rooms 
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'occupied'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE  -- Only reserved if check-in is today or earlier
      AND br.check_out_date >= CURRENT_DATE -- And check-out is today or later
    ) THEN 'reserved'
    -- REMOVED: Future reservations should NOT make room show as reserved
    ELSE 'available'
  END;
END;
$$ LANGUAGE plpgsql;

-- 3) Create a function to get room availability for a specific date (for future planning)
CREATE OR REPLACE FUNCTION public.get_room_availability_for_date(target_date date)
RETURNS TABLE(
  room_id uuid,
  room_number text,
  status text,
  booking_id uuid,
  guest_name text,
  check_in_date date,
  check_out_date date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as room_id,
    r.number as room_number,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.booking_rooms br 
        WHERE br.room_id = r.id 
        AND br.room_status = 'checked_in'
        AND br.check_out_date >= target_date
      ) THEN 'occupied'
      WHEN EXISTS (
        SELECT 1 FROM public.booking_rooms br 
        WHERE br.room_id = r.id 
        AND br.room_status = 'reserved'
        AND br.check_in_date <= target_date
        AND br.check_out_date >= target_date
      ) THEN 'reserved'
      ELSE 'available'
    END as status,
    b.id as booking_id,
    g.name as guest_name,
    br.check_in_date,
    br.check_out_date
  FROM public.rooms r
  LEFT JOIN public.booking_rooms br ON br.room_id = r.id 
    AND br.room_status IN ('reserved', 'checked_in')
    AND br.check_in_date <= target_date
    AND br.check_out_date >= target_date
  LEFT JOIN public.bookings b ON br.booking_id = b.id
  LEFT JOIN public.guests g ON b.guest_id = g.id
  ORDER BY r.number;
END;
$$ LANGUAGE plpgsql;

-- 4) Create a function to sync room status for a specific date (for daily maintenance)
CREATE OR REPLACE FUNCTION public.sync_room_status_for_date(target_date date)
RETURNS void AS $$
BEGIN
  UPDATE public.rooms 
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= target_date
    ) THEN 'occupied'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'reserved'
      AND br.check_in_date <= target_date
      AND br.check_out_date >= target_date
    ) THEN 'reserved'
    ELSE 'available'
  END;
END;
$$ LANGUAGE plpgsql;

-- 5) Add comments for documentation
COMMENT ON FUNCTION public.sync_room_status_from_booking_rooms() IS 'Updates room status based on booking_rooms. Only shows rooms as reserved if reservation is active on current date, not future dates.';
COMMENT ON FUNCTION public.sync_all_room_status() IS 'Syncs all room statuses based on current date. Future reservations do not affect current room availability.';
COMMENT ON FUNCTION public.get_room_availability_for_date(date) IS 'Gets room availability for a specific date. Useful for future planning and availability checks.';
COMMENT ON FUNCTION public.sync_room_status_for_date(date) IS 'Syncs room statuses for a specific date. Useful for daily maintenance and date-specific operations.';

-- 6) Run the sync to update all room statuses immediately
SELECT public.sync_all_room_status();

-- 7) Log the fix
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
  'Fixed room status logic to only show current day availability. Future reservations no longer affect current room status.',
  now()
) ON CONFLICT DO NOTHING;
