-- Add booked_on column to bookings table
-- This column tracks when the booking was actually made (may differ from created_at)

-- 1) Add booked_on column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booked_on'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN booked_on timestamp with time zone;
  END IF;
END $$;

-- 2) Backfill existing bookings with created_at value for booked_on
-- This assumes that for existing bookings, the booking was made when the record was created
UPDATE public.bookings 
SET booked_on = created_at 
WHERE booked_on IS NULL;

-- 3) Add constraint to ensure booked_on is not null for new bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_booked_on_not_null'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_booked_on_not_null
      CHECK (booked_on IS NOT NULL);
  END IF;
END $$;

-- 4) Add index for better query performance on booked_on
CREATE INDEX IF NOT EXISTS idx_bookings_booked_on ON public.bookings (booked_on);

-- 5) Add comment to explain the column purpose
COMMENT ON COLUMN public.bookings.booked_on IS 'Timestamp when the booking was actually made by the guest (may differ from created_at which is when the record was inserted into the database)';
