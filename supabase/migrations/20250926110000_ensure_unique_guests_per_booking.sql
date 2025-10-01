-- Ensure unique guests per booking
-- This migration documents the change to create new guest records for each booking
-- instead of reusing existing guests with the same phone number

-- 1) Add a comment to the guests table explaining the new behavior
COMMENT ON TABLE public.guests IS 'Guest records. Each booking now creates a new guest record to ensure data integrity and prevent name updates across bookings.';

-- 2) Add a comment to the bookings table
COMMENT ON TABLE public.bookings IS 'Booking records. Each booking is now associated with a unique guest record, even if the phone number is the same.';

-- 3) Create an index on phone numbers for faster lookups (but allow duplicates)
CREATE INDEX IF NOT EXISTS idx_guests_phone ON public.guests(phone);

-- 4) Add a function to get guest statistics (useful for reporting)
CREATE OR REPLACE FUNCTION public.get_guest_statistics()
RETURNS TABLE(
  total_guests bigint,
  unique_phone_numbers bigint,
  guests_with_multiple_bookings bigint,
  most_common_phone_number text,
  phone_number_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_guests,
    COUNT(DISTINCT phone) as unique_phone_numbers,
    COUNT(*) - COUNT(DISTINCT phone) as guests_with_multiple_bookings,
    (SELECT phone FROM public.guests GROUP BY phone ORDER BY COUNT(*) DESC LIMIT 1) as most_common_phone_number,
    (SELECT COUNT(*) FROM public.guests GROUP BY phone ORDER BY COUNT(*) DESC LIMIT 1) as phone_number_count
  FROM public.guests;
END;
$$ LANGUAGE plpgsql;

-- 5) Add a function to find guests with the same phone number (for data analysis)
CREATE OR REPLACE FUNCTION public.get_guests_by_phone(phone_number text)
RETURNS TABLE(
  guest_id uuid,
  name text,
  email text,
  phone text,
  created_at timestamptz,
  total_bookings bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as guest_id,
    g.name,
    g.email,
    g.phone,
    g.created_at,
    COUNT(b.id) as total_bookings
  FROM public.guests g
  LEFT JOIN public.bookings b ON g.id = b.guest_id
  WHERE g.phone = phone_number
  GROUP BY g.id, g.name, g.email, g.phone, g.created_at
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6) Add comments for the new functions
COMMENT ON FUNCTION public.get_guest_statistics() IS 'Returns statistics about guest records, including counts of unique phone numbers and duplicate phone numbers.';
COMMENT ON FUNCTION public.get_guests_by_phone(text) IS 'Returns all guest records with the specified phone number, useful for finding duplicate guests.';

-- 7) Log the change
INSERT INTO public.staff_logs (
  hotel_id,
  staff_id,
  action,
  details,
  created_at
) VALUES (
  (SELECT id FROM public.hotels LIMIT 1),
  NULL,
  'SYSTEM_MAINTENANCE',
  'Updated booking system to create new guest records for each booking instead of reusing existing guests. This prevents name updates across bookings when using the same phone number.',
  now()
) ON CONFLICT DO NOTHING;
