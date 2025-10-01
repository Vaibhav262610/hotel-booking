-- Add cancellation tracking infrastructure to bookings table
-- Create cancelled_bookings table for detailed cancellation records

-- 1) Add cancellation tracking columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancel_date timestamptz,
ADD COLUMN IF NOT EXISTS cancelled_by_staff_id uuid REFERENCES public.staff(id);

-- 2) Add index for cancellation queries
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled 
ON public.bookings (status, cancel_date) 
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by_staff 
ON public.bookings (cancelled_by_staff_id) 
WHERE status = 'cancelled';

-- 3) Create cancelled_bookings table for detailed cancellation records
CREATE TABLE IF NOT EXISTS public.cancelled_bookings (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  cancellation_reason text NOT NULL,
  cancel_date timestamptz NOT NULL DEFAULT now(),
  cancelled_by_staff_id uuid REFERENCES public.staff(id),
  refund_amount numeric(10,2) DEFAULT 0,
  refund_processed boolean DEFAULT false,
  refund_processed_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one cancellation record per booking
  UNIQUE(booking_id)
);

-- 4) Add indexes for cancelled_bookings
CREATE INDEX IF NOT EXISTS idx_cancelled_bookings_booking_id 
ON public.cancelled_bookings (booking_id);

CREATE INDEX IF NOT EXISTS idx_cancelled_bookings_cancel_date 
ON public.cancelled_bookings (cancel_date);

CREATE INDEX IF NOT EXISTS idx_cancelled_bookings_staff 
ON public.cancelled_bookings (cancelled_by_staff_id);

CREATE INDEX IF NOT EXISTS idx_cancelled_bookings_refund_processed 
ON public.cancelled_bookings (refund_processed);

-- 5) Create function to handle booking cancellation
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_cancellation_reason text,
  p_cancelled_by_staff_id uuid DEFAULT NULL,
  p_refund_amount numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_cancelled_booking_id uuid;
  v_booking_exists boolean;
BEGIN
  -- Check if booking exists and is not already cancelled
  SELECT EXISTS(
    SELECT 1 FROM public.bookings 
    WHERE id = p_booking_id AND status != 'cancelled'
  ) INTO v_booking_exists;
  
  IF NOT v_booking_exists THEN
    RAISE EXCEPTION 'Booking not found or already cancelled';
  END IF;
  
  -- Update booking status and cancellation details
  UPDATE public.bookings 
  SET 
    status = 'cancelled',
    cancellation_reason = p_cancellation_reason,
    cancel_date = now(),
    cancelled_by_staff_id = p_cancelled_by_staff_id,
    updated_at = now()
  WHERE id = p_booking_id;
  
  -- Create detailed cancellation record
  INSERT INTO public.cancelled_bookings (
    booking_id,
    cancellation_reason,
    cancel_date,
    cancelled_by_staff_id,
    refund_amount,
    notes
  ) VALUES (
    p_booking_id,
    p_cancellation_reason,
    now(),
    p_cancelled_by_staff_id,
    p_refund_amount,
    p_notes
  ) RETURNING id INTO v_cancelled_booking_id;
  
  -- Update room statuses to cancelled
  UPDATE public.booking_rooms 
  SET 
    room_status = 'cancelled',
    updated_at = now()
  WHERE booking_id = p_booking_id;
  
  RETURN v_cancelled_booking_id;
END;
$$;

-- 6) Create function to get cancellation statistics
CREATE OR REPLACE FUNCTION public.get_cancellation_stats(
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL
)
RETURNS TABLE (
  total_cancelled bigint,
  cancelled_by_reason jsonb,
  cancelled_by_staff jsonb,
  total_refund_amount numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_cancelled,
    COALESCE(
      jsonb_object_agg(
        COALESCE(cb.cancellation_reason, 'No reason provided'), 
        reason_count
      ) FILTER (WHERE cb.cancellation_reason IS NOT NULL),
      '{}'::jsonb
    ) as cancelled_by_reason,
    COALESCE(
      jsonb_object_agg(
        COALESCE(s.name, 'Unknown Staff'), 
        staff_count
      ) FILTER (WHERE s.name IS NOT NULL),
      '{}'::jsonb
    ) as cancelled_by_staff,
    COALESCE(SUM(cb.refund_amount), 0) as total_refund_amount
  FROM (
    SELECT 
      cb.cancellation_reason,
      cb.cancelled_by_staff_id,
      cb.refund_amount,
      COUNT(*) as reason_count,
      COUNT(*) as staff_count
    FROM public.cancelled_bookings cb
    LEFT JOIN public.staff s ON cb.cancelled_by_staff_id = s.id
    WHERE 
      (p_from_date IS NULL OR cb.cancel_date::date >= p_from_date)
      AND (p_to_date IS NULL OR cb.cancel_date::date <= p_to_date)
    GROUP BY cb.cancellation_reason, cb.cancelled_by_staff_id, cb.refund_amount
  ) cb
  LEFT JOIN public.staff s ON cb.cancelled_by_staff_id = s.id;
END;
$$;

-- 7) Add update trigger for cancelled_bookings
CREATE OR REPLACE FUNCTION public.update_cancelled_bookings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_cancelled_bookings_updated_at
  BEFORE UPDATE ON public.cancelled_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cancelled_bookings_updated_at();

-- 8) Add comments for documentation
COMMENT ON TABLE public.cancelled_bookings IS 'Detailed records of booking cancellations with refund tracking';
COMMENT ON COLUMN public.cancelled_bookings.cancellation_reason IS 'Reason provided for cancellation';
COMMENT ON COLUMN public.cancelled_bookings.cancel_date IS 'Date and time when booking was cancelled';
COMMENT ON COLUMN public.cancelled_bookings.cancelled_by_staff_id IS 'Staff member who processed the cancellation';
COMMENT ON COLUMN public.cancelled_bookings.refund_amount IS 'Amount to be refunded for the cancellation';
COMMENT ON COLUMN public.cancelled_bookings.refund_processed IS 'Whether the refund has been processed';
COMMENT ON COLUMN public.cancelled_bookings.refund_processed_date IS 'Date when refund was processed';

COMMENT ON FUNCTION public.cancel_booking IS 'Cancels a booking and creates detailed cancellation record';
COMMENT ON FUNCTION public.get_cancellation_stats IS 'Returns cancellation statistics for a date range';
