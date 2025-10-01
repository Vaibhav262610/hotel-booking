-- Add expected check-in and check-out times for same-day bookings
-- These fields store the planned times when check-in and check-out dates are the same

ALTER TABLE public.booking_rooms 
ADD COLUMN expected_check_in_time timestamptz,
ADD COLUMN expected_check_out_time timestamptz;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_rooms_expected_checkin_time ON public.booking_rooms (expected_check_in_time);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_expected_checkout_time ON public.booking_rooms (expected_check_out_time);

-- Add comments
COMMENT ON COLUMN public.booking_rooms.expected_check_in_time IS 'Expected check-in time for same-day bookings (when check_in_date = check_out_date)';
COMMENT ON COLUMN public.booking_rooms.expected_check_out_time IS 'Expected check-out time for same-day bookings (when check_in_date = check_out_date)';

-- Log the enhancement
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
  'Added expected check-in and check-out time fields to support same-day bookings with specific times',
  now()
) ON CONFLICT DO NOTHING;
