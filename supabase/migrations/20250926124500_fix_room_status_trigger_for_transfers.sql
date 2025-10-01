-- Ensure room status sync updates BOTH source and target rooms on transfer

-- Helper: compute status for a single room based on current-day bookings
CREATE OR REPLACE FUNCTION public.compute_room_status_for(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text := 'available';
BEGIN
  IF p_room_id IS NULL THEN
    RETURN v_status;
  END IF;

  -- Occupied if any checked-in stay active today or with future checkout
  IF EXISTS (
    SELECT 1
    FROM public.booking_rooms br
    WHERE br.room_id = p_room_id
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
  ) THEN
    RETURN 'occupied';
  END IF;

  -- Reserved only if reservation window includes today
  IF EXISTS (
    SELECT 1
    FROM public.booking_rooms br
    WHERE br.room_id = p_room_id
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
  ) THEN
    RETURN 'reserved';
  END IF;

  RETURN v_status;
END;
$$;

-- Trigger: update both OLD and NEW room ids when applicable
CREATE OR REPLACE FUNCTION public.sync_room_status_from_booking_rooms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.rooms r
      SET status = public.compute_room_status_for(OLD.room_id),
          updated_at = now()
      WHERE r.id = OLD.room_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update status for the source room if room_id changed
    IF NEW.room_id IS DISTINCT FROM OLD.room_id THEN
      UPDATE public.rooms r
        SET status = public.compute_room_status_for(OLD.room_id),
            updated_at = now()
        WHERE r.id = OLD.room_id;
    END IF;
    -- Always update status for the affected (target or same) room
    UPDATE public.rooms r
      SET status = public.compute_room_status_for(NEW.room_id),
          updated_at = now()
      WHERE r.id = NEW.room_id;
    RETURN NEW;
  ELSE
    -- INSERT
    UPDATE public.rooms r
      SET status = public.compute_room_status_for(NEW.room_id),
          updated_at = now()
      WHERE r.id = NEW.room_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Recreate trigger to ensure it uses the latest function
DROP TRIGGER IF EXISTS trg_booking_rooms_sync_room_status ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_sync_room_status
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_room_status_from_booking_rooms();


