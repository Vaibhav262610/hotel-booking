-- Add purpose column to bookings table for police reports

DO $$
BEGIN
  -- Add purpose column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'purpose'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN purpose character varying(255);
  END IF;
END $$;

-- Add comment to document the purpose column
COMMENT ON COLUMN public.bookings.purpose IS 'Purpose of visit for police reporting requirements';
