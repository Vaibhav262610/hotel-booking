-- Add grace_time column to booking_rooms table
-- This tracks the grace period given for late checkout (default 1 hour)

-- Add the grace_time column
ALTER TABLE public.booking_rooms 
ADD COLUMN grace_time interval NOT NULL DEFAULT interval '1 hour';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_booking_rooms_grace_time ON public.booking_rooms (grace_time);

-- Ensure existing rows have a value (though DEFAULT should handle this)
UPDATE public.booking_rooms 
SET grace_time = interval '1 hour' 
WHERE grace_time IS NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.booking_rooms.grace_time IS 'Grace period given for late checkout, defaults to 1 hour';
