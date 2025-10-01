-- Add arrival_from to guests and index nationality for foreigner report

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guests' AND column_name = 'arrival_from'
  ) THEN
    ALTER TABLE public.guests
      ADD COLUMN arrival_from text;
  END IF;
END $$;

-- Helpful index for nationality filtering (case-insensitive search still benefits)
CREATE INDEX IF NOT EXISTS idx_guests_nationality ON public.guests (nationality);


