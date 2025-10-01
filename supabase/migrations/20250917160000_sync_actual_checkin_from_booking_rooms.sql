-- Sync actual_check_in from booking_rooms to bookings table
-- The actual_check_in in bookings should be the earliest actual_check_in from booking_rooms

-- 1) Create function to sync actual_check_in from booking_rooms to bookings
CREATE OR REPLACE FUNCTION public.sync_actual_checkin_from_booking_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the booking's actual_check_in to the earliest actual_check_in from booking_rooms
  UPDATE public.bookings
  SET actual_check_in = (
    SELECT MIN(br.actual_check_in)
    FROM public.booking_rooms br
    WHERE br.booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
      AND br.actual_check_in IS NOT NULL
  )
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2) Create trigger to sync actual_check_in when booking_rooms changes
DROP TRIGGER IF EXISTS trg_sync_actual_checkin_from_booking_rooms ON public.booking_rooms;
CREATE TRIGGER trg_sync_actual_checkin_from_booking_rooms
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_actual_checkin_from_booking_rooms();

-- 3) Backfill existing bookings with actual_check_in from their booking_rooms
UPDATE public.bookings
SET actual_check_in = (
  SELECT MIN(br.actual_check_in)
  FROM public.booking_rooms br
  WHERE br.booking_id = bookings.id
    AND br.actual_check_in IS NOT NULL
)
WHERE id IN (
  SELECT DISTINCT booking_id 
  FROM public.booking_rooms 
  WHERE actual_check_in IS NOT NULL
);

-- 4) Add comment explaining the sync
COMMENT ON FUNCTION public.sync_actual_checkin_from_booking_rooms() IS 'Syncs actual_check_in in bookings table with the earliest actual_check_in from booking_rooms for that booking';
