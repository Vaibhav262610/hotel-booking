-- Create booking_rooms junction table to support multiple rooms per booking
-- Remove room_id from bookings table and replace with booking_rooms relationship

-- 1) Create booking_rooms junction table
CREATE TABLE IF NOT EXISTS public.booking_rooms (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  room_status varchar(20) DEFAULT 'reserved' NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate room assignments for same booking
  UNIQUE(booking_id, room_id),
  
  -- Ensure check_out > check_in
  CHECK (check_out_date > check_in_date),
  
  -- Ensure valid room status
  CHECK (room_status IN ('reserved', 'checked_in', 'checked_out', 'cancelled'))
);

-- 2) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON public.booking_rooms (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_id ON public.booking_rooms (room_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_dates ON public.booking_rooms (check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_status ON public.booking_rooms (room_status);

-- 3) Migrate existing data from bookings.room_id to booking_rooms
INSERT INTO public.booking_rooms (booking_id, room_id, check_in_date, check_out_date, actual_check_in, actual_check_out, room_status)
SELECT 
  b.id as booking_id,
  b.room_id,
  b.check_in as check_in_date,
  b.expected_checkout as check_out_date,
  b.actual_check_in,
  b.actual_check_out,
  CASE 
    WHEN b.status = 'checked_in' THEN 'checked_in'
    WHEN b.status = 'checked_out' THEN 'checked_out'
    WHEN b.status = 'cancelled' THEN 'cancelled'
    ELSE 'reserved'
  END as room_status
FROM public.bookings b
WHERE b.room_id IS NOT NULL;

-- 4) Create function to sync room status when booking_rooms changes
CREATE OR REPLACE FUNCTION public.sync_room_status_from_booking_rooms()
RETURNS TRIGGER AS $$
BEGIN
  -- Update room status based on booking_rooms
  UPDATE public.rooms 
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'occupied'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'reserved'
    ELSE 'available'
  END
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5) Create triggers to automatically sync room status
DROP TRIGGER IF EXISTS trg_booking_rooms_sync_room_status ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_sync_room_status
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_room_status_from_booking_rooms();

-- 6) Create function to update room status for all rooms (for initial sync)
CREATE OR REPLACE FUNCTION public.sync_all_room_status()
RETURNS void AS $$
BEGIN
  UPDATE public.rooms 
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'occupied'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'reserved'
    ELSE 'available'
  END;
END;
$$ LANGUAGE plpgsql;

-- 7) Sync all room statuses after migration
SELECT public.sync_all_room_status();

-- 8) Update any views that reference bookings.room_id BEFORE dropping the column
-- Drop and recreate booking_payment_summary view
DROP VIEW IF EXISTS public.booking_payment_summary CASCADE;
CREATE OR REPLACE VIEW public.booking_payment_summary AS
SELECT 
  b.id AS booking_id,
  b.booking_number,
  COALESCE(bpb.total_amount, 0) AS total_amount,
  b.price_adjustment,
  COALESCE(SUM(CASE WHEN pt.transaction_type = 'advance' THEN pt.amount ELSE 0 END),0) AS total_advance_paid,
  COALESCE(SUM(CASE WHEN pt.transaction_type = 'receipt' THEN pt.amount ELSE 0 END),0) AS total_receipt_paid,
  COUNT(pt.id) AS total_transactions,
  STRING_AGG(DISTINCT pt.payment_method::text, ', ') AS payment_methods_used
FROM public.bookings b
LEFT JOIN public.payment_transactions pt ON b.id = pt.booking_id
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
GROUP BY b.id, b.booking_number, bpb.total_amount, b.price_adjustment;

-- 9) Update active_checkout_alerts view to use booking_rooms
DROP VIEW IF EXISTS public.active_checkout_alerts CASCADE;
CREATE OR REPLACE VIEW public.active_checkout_alerts AS
SELECT 
  br.id as alert_id,
  b.id as booking_id,
  b.booking_number,
  g.name as guest_name,
  r.number as room_number,
  rt.name::character varying(50) AS "room_type",
  br.check_out_date as expected_checkout,
  br.actual_check_out,
  CASE 
    WHEN br.actual_check_out IS NOT NULL THEN 'completed'
    WHEN br.check_out_date < CURRENT_DATE THEN 'overdue'
    WHEN br.check_out_date = CURRENT_DATE THEN 'due_today'
    ELSE 'upcoming'
  END as status,
  br.created_at
FROM public.booking_rooms br
JOIN public.bookings b ON br.booking_id = b.id
JOIN public.guests g ON b.guest_id = g.id
JOIN public.rooms r ON br.room_id = r.id
JOIN public.room_types rt ON r.room_type_id = rt.id
WHERE br.room_status IN ('checked_in', 'reserved')
  AND br.check_out_date >= CURRENT_DATE - INTERVAL '1 day'
  AND br.check_out_date <= CURRENT_DATE + INTERVAL '7 days';

-- 10) Drop the foreign key constraint on bookings.room_id
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;

-- 11) Drop the room_id column from bookings table
ALTER TABLE public.bookings DROP COLUMN IF EXISTS room_id;

-- 12) Add comments for documentation
COMMENT ON TABLE public.booking_rooms IS 'Junction table linking bookings to multiple rooms. Each row represents one room assigned to a booking.';
COMMENT ON COLUMN public.booking_rooms.room_status IS 'Status of this specific room in this booking: reserved, checked_in, checked_out, cancelled';
COMMENT ON COLUMN public.booking_rooms.check_in_date IS 'Scheduled check-in date for this room';
COMMENT ON COLUMN public.booking_rooms.check_out_date IS 'Scheduled check-out date for this room';
COMMENT ON COLUMN public.booking_rooms.actual_check_in IS 'Actual check-in timestamp for this room';
COMMENT ON COLUMN public.booking_rooms.actual_check_out IS 'Actual check-out timestamp for this room';
