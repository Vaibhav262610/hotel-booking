-- Add guest counts (pax) and billing fields to bookings

DO $$
BEGIN
  -- number_of_guests (planned total pax, excluding children if you track separately)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'number_of_guests'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN number_of_guests integer;
  END IF;

  -- child_guests (planned children count)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'child_guests'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN child_guests integer;
  END IF;

  -- extra_guests (actual extra pax beyond planned occupancy)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'extra_guests'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN extra_guests integer;
  END IF;

  -- bill_number (invoice reference, typically assigned at checkout)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'bill_number'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN bill_number character varying(50);
  END IF;
END $$;


-- Non-negative checks (allow NULL for unknown)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_number_of_guests_non_negative'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_number_of_guests_non_negative
      CHECK (number_of_guests IS NULL OR number_of_guests >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_child_guests_non_negative'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_child_guests_non_negative
      CHECK (child_guests IS NULL OR child_guests >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_extra_guests_non_negative'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_extra_guests_non_negative
      CHECK (extra_guests IS NULL OR extra_guests >= 0);
  END IF;
END $$;


-- Ensure bill_number uniqueness per hotel when present
-- Partial unique index to allow multiple NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_hotel_bill_number
ON public.bookings (hotel_id, bill_number)
WHERE bill_number IS NOT NULL;


