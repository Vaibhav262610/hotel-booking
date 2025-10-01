-- Add planned_nights and actual_nights to bookings, enforce status values,
-- create trigger to compute nights, and backfill existing rows.

DO $$
BEGIN
  -- Add planned_nights if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'planned_nights'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN planned_nights integer;
  END IF;

  -- Add actual_nights if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'actual_nights'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN actual_nights integer;
  END IF;

  -- Drop existing status check if present, then enforce allowed values
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_status_check_allowed_values'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check_allowed_values;
  END IF;

  -- Allowed statuses: pending, confirmed, checked_in, checked_out, cancelled, no_show
  -- Add as NOT VALID first to avoid failing on existing rows; we'll normalize then validate
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_status_check_allowed_values
    CHECK (status IN (
      'pending',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
      'no_show'
    )) NOT VALID;
END $$;


-- Trigger function to compute planned_nights and actual_nights
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
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
    planned_diff := (NEW.check_out - NEW.check_in);
    IF planned_diff < 0 THEN
      NEW.planned_nights := 0;
    ELSE
      IF NEW.status = 'cancelled' THEN
        NEW.planned_nights := NULL;
      ELSE
        -- Minimum 1 night for same-day or positive stays
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


-- Create or replace trigger: before insert/update of relevant fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_compute_booking_nights'
  ) THEN
    DROP TRIGGER trg_compute_booking_nights ON public.bookings;
  END IF;

  CREATE TRIGGER trg_compute_booking_nights
  BEFORE INSERT OR UPDATE OF check_in, check_out, actual_check_in, actual_check_out, status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_booking_nights();
END $$;


-- Normalize existing statuses into the allowed set where needed
-- Heuristics: if actual_check_in set and actual_check_out null => checked_in
-- if actual_check_out set => checked_out
-- otherwise keep existing if already allowed, else default to confirmed
UPDATE public.bookings b
SET status = CASE
  WHEN b.status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show') THEN b.status
  WHEN b.actual_check_out IS NOT NULL THEN 'checked_out'
  WHEN b.actual_check_in IS NOT NULL AND b.actual_check_out IS NULL THEN 'checked_in'
  ELSE 'confirmed'
END;

-- Now validate the status constraint after normalization
ALTER TABLE public.bookings
  VALIDATE CONSTRAINT bookings_status_check_allowed_values;


-- Backfill nights for existing rows using the trigger logic
-- This will fire the BEFORE UPDATE trigger to populate both columns
UPDATE public.bookings
SET check_in = check_in
WHERE TRUE;


-- Optional: ensure non-negative values if data oddities exist
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_planned_nights_non_negative CHECK (planned_nights IS NULL OR planned_nights >= 0);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_actual_nights_non_negative CHECK (actual_nights IS NULL OR actual_nights >= 0);


