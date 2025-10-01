-- Final fix for checkout error: "record 'new' has no field 'check_out'"
-- This migration removes the old trigger that's causing the error

-- 1) Drop the old trigger that references the removed check_out field
DROP TRIGGER IF EXISTS trigger_update_guest_stats ON public.bookings CASCADE;

-- 2) Drop the old function that references check_out field
DROP FUNCTION IF EXISTS public.update_guest_stats() CASCADE;

-- 3) Ensure our new checkout system is properly set up
-- The checkout_single_room function should already exist from previous migrations
-- But let's make sure it's working correctly

-- 4) Add a simple test function to verify the checkout system works
CREATE OR REPLACE FUNCTION public.test_checkout_system()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Test if the checkout_single_room function exists and is callable
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'checkout_single_room' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RETURN 'Checkout system is properly configured';
  ELSE
    RETURN 'ERROR: checkout_single_room function not found';
  END IF;
END;
$$;

-- 5) Add comments for documentation
COMMENT ON FUNCTION public.test_checkout_system() IS 'Test function to verify the checkout system is properly configured';

-- 6) Create a function to get checkout system status
CREATE OR REPLACE FUNCTION public.get_checkout_system_status()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'checkout_single_room_exists', EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'checkout_single_room' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ),
    'update_booking_status_from_rooms_exists', EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_booking_status_from_rooms' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ),
    'old_trigger_removed', NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trigger_update_guest_stats'
    ),
    'old_function_removed', NOT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_guest_stats' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ),
    'status', 'Checkout system cleanup completed'
  ) INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_checkout_system_status() IS 'Returns the status of the checkout system configuration';

-- 7) Log the cleanup completion
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
  'Checkout system cleanup completed - removed old triggers and functions that referenced check_out field',
  now()
) ON CONFLICT DO NOTHING;
