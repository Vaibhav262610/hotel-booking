-- Add meal plan, plan name, and total pax columns to bookings table
-- Create trigger to auto-update total_pax when pax fields change

DO $$
BEGIN
  -- Add meal_plan column (CP/MAP/EP, default: EP)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'meal_plan'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN meal_plan character varying(10) DEFAULT 'EP';
  END IF;

  -- Add plan_name column (default: STD)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'plan_name'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN plan_name character varying(20) DEFAULT 'STD';
  END IF;

  -- Add total_pax column (computed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'total_pax'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN total_pax integer DEFAULT 0;
  END IF;
END $$;

-- Add constraints for meal_plan values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_meal_plan_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_meal_plan_check
      CHECK (meal_plan IN ('CP', 'MAP', 'EP'));
  END IF;
END $$;

-- Non-negative check for total_pax
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_total_pax_non_negative'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_total_pax_non_negative
      CHECK (total_pax >= 0);
  END IF;
END $$;

-- Create trigger function to compute total_pax
CREATE OR REPLACE FUNCTION public.compute_total_pax()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Compute total_pax when any pax field changes
  NEW.total_pax := COALESCE(NEW.number_of_guests, 0) + 
                   COALESCE(NEW.extra_guests, 0) + 
                   COALESCE(NEW.child_guests, 0);
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update total_pax
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compute_total_pax'
  ) THEN
    DROP TRIGGER trg_compute_total_pax ON public.bookings;
  END IF;

  CREATE TRIGGER trg_compute_total_pax
  BEFORE INSERT OR UPDATE OF number_of_guests, extra_guests, child_guests ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_total_pax();
END $$;

-- Backfill existing rows with computed total_pax
UPDATE public.bookings 
SET total_pax = COALESCE(number_of_guests, 0) + COALESCE(extra_guests, 0) + COALESCE(child_guests, 0)
WHERE total_pax IS NULL OR total_pax = 0;
