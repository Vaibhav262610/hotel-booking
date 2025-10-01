-- Allow same-day check-in and check-out for hourly bookings
-- Change constraint from check_out_date > check_in_date to check_out_date >= check_in_date

-- Drop the existing constraint that prevents same-day bookings
ALTER TABLE public.booking_rooms 
DROP CONSTRAINT IF EXISTS booking_rooms_check;

-- Add the new constraint that allows same-day bookings
ALTER TABLE public.booking_rooms 
ADD CONSTRAINT booking_rooms_check 
CHECK (check_out_date >= check_in_date);

-- Add comment explaining the change
COMMENT ON CONSTRAINT booking_rooms_check ON public.booking_rooms 
IS 'Allows same-day bookings where check-in and check-out dates are the same (hourly bookings)';

-- Log the change
INSERT INTO public.staff_logs (
  hotel_id,
  staff_id,
  action,
  details,
  created_at
) VALUES (
  (SELECT id FROM public.hotels LIMIT 1),
  NULL,
  'SYSTEM_ENHANCEMENT',
  'Enabled same-day check-in/checkout feature. Guests can now book for less than 24 hours with same check-in and check-out dates.',
  now()
) ON CONFLICT DO NOTHING;
