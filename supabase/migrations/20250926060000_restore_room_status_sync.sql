-- Restore room status synchronization functionality
-- This migration fixes the critical bug where room status is not updated when bookings are created
-- The trg_booking_rooms_sync_room_status trigger was accidentally removed in previous cleanup

-- 1) Recreate the room status synchronization function
CREATE OR REPLACE FUNCTION public.sync_room_status_from_booking_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update room status based on booking_rooms
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
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'reserved'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
      AND br.room_status = 'reserved'
      AND br.check_in_date > CURRENT_DATE
    ) THEN 'reserved'
    ELSE 'available'
  END
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2) Create the room status synchronization trigger
DROP TRIGGER IF EXISTS trg_booking_rooms_sync_room_status ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_sync_room_status
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_room_status_from_booking_rooms();

-- 3) Recreate the function to sync all room statuses (for initial sync)
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
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'reserved'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'reserved'
      AND br.check_in_date > CURRENT_DATE
    ) THEN 'reserved'
    ELSE 'available'
  END;
END;
$$ LANGUAGE plpgsql;

-- 4) Sync all room statuses immediately to fix existing data
SELECT public.sync_all_room_status();

-- 5) Add comments for documentation
COMMENT ON FUNCTION public.sync_room_status_from_booking_rooms() IS 'Updates room status in rooms table when booking_rooms records change. Sets status to occupied/reserved/available based on booking_rooms data.';
COMMENT ON FUNCTION public.sync_all_room_status() IS 'Syncs all room statuses based on current booking_rooms data. Used for initial sync and maintenance.';
