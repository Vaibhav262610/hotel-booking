-- Rename bookings.check_out to bookings.expected_checkout and update dependent functions/triggers

DO $$
BEGIN
  -- Rename column if it exists and expected_checkout not already present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_out'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'expected_checkout'
  ) THEN
    ALTER TABLE public.bookings RENAME COLUMN check_out TO expected_checkout;
  END IF;
END $$;


-- Update compute_booking_nights trigger function to use expected_checkout
CREATE OR REPLACE FUNCTION public.compute_booking_nights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  planned_diff integer;
  actual_seconds numeric;
  actual_days numeric;
  actual_ceiled integer;
BEGIN
  -- Compute planned_nights when both dates are present
  IF NEW.check_in IS NOT NULL AND NEW.expected_checkout IS NOT NULL THEN
    planned_diff := (NEW.expected_checkout - NEW.check_in);
    IF planned_diff < 0 THEN
      NEW.planned_nights := 0;
    ELSE
      IF NEW.status = 'cancelled' THEN
        NEW.planned_nights := NULL;
      ELSE
        NEW.planned_nights := GREATEST(planned_diff, 1);
      END IF;
    END IF;
  ELSE
    NEW.planned_nights := NULL;
  END IF;

  -- Compute actual_nights when both timestamps are present
  IF NEW.actual_check_in IS NOT NULL AND NEW.actual_check_out IS NOT NULL THEN
    actual_seconds := EXTRACT(EPOCH FROM (NEW.actual_check_out - NEW.actual_check_in));
    IF actual_seconds IS NULL OR actual_seconds <= 0 THEN
      NEW.actual_nights := 0;
    ELSE
      actual_days := actual_seconds / 86400.0;
      actual_ceiled := CEIL(actual_days);
      IF NEW.status = 'cancelled' THEN
        NEW.actual_nights := NULL;
      ELSE
        NEW.actual_nights := GREATEST(actual_ceiled, 1);
      END IF;
    END IF;
  ELSE
    NEW.actual_nights := NULL;
  END IF;

  RETURN NEW;
END;
$$;


-- Ensure trigger watches expected_checkout instead of check_out
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compute_booking_nights'
  ) THEN
    DROP TRIGGER trg_compute_booking_nights ON public.bookings;
  END IF;

  CREATE TRIGGER trg_compute_booking_nights
  BEFORE INSERT OR UPDATE OF check_in, expected_checkout, actual_check_in, actual_check_out, status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_booking_nights();
END $$;


-- Update update_guest_stats to reference expected_checkout
CREATE OR REPLACE FUNCTION public.update_guest_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update guest statistics when a booking is completed
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    UPDATE guests 
    SET 
      total_stays = total_stays + 1,
      total_spent = total_spent + COALESCE(NEW.final_amount, NEW.total_amount),
      last_stay_date = NEW.expected_checkout
    WHERE id = NEW.guest_id;
    
    -- Insert visit record
    INSERT INTO guest_visits (
      guest_id, 
      booking_id, 
      check_in_date, 
      check_out_date, 
      room_type,
      total_amount
    ) VALUES (
      NEW.guest_id,
      NEW.id,
      NEW.check_in,
      NEW.expected_checkout,
      (SELECT type FROM rooms WHERE id = NEW.room_id),
      COALESCE(NEW.final_amount, NEW.total_amount)
    );
  END IF;
  RETURN NEW;
END;
$$;


