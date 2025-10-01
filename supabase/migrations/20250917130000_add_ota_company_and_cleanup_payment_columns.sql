-- Add OTA/Company column and remove unnecessary payment columns from bookings table
-- Create trigger to auto-set arrival_type to OTA when OTA/Company is not null

-- 1) Add OTA/Company column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'ota_company'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN ota_company character varying(100);
  END IF;
END $$;

-- 2) Drop and recreate booking_payment_summary view to remove dependencies on columns we're dropping
DROP VIEW IF EXISTS public.booking_payment_summary CASCADE;

-- 3) Remove payment-related columns that are now handled by payment_transactions and booking_payment_breakdown
DO $$
BEGIN
  -- Remove payment_method (now handled by payment_transactions)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN payment_method;
  END IF;

  -- Remove advance_amount (now handled by booking_payment_breakdown)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'advance_amount'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN advance_amount;
  END IF;

  -- Remove final_amount (now handled by booking_payment_breakdown.total_amount)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'final_amount'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN final_amount;
  END IF;

  -- Remove remaining_balance_collected (now handled by payment_transactions)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'remaining_balance_collected'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN remaining_balance_collected;
  END IF;

  -- Remove remaining_balance_collected_by (now handled by payment_transactions.collected_by)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'remaining_balance_collected_by'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN remaining_balance_collected_by;
  END IF;

  -- Remove remaining_balance_payment_method (now handled by payment_transactions.payment_method)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'remaining_balance_payment_method'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN remaining_balance_payment_method;
  END IF;
END $$;

-- 4) Recreate booking_payment_summary view without the dropped columns
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

-- 5) Create trigger function to auto-set arrival_type to OTA when ota_company is not null
CREATE OR REPLACE FUNCTION public.set_arrival_type_from_ota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If ota_company is not null, set arrival_type to 'OTA'
  IF NEW.ota_company IS NOT NULL AND TRIM(NEW.ota_company) != '' THEN
    NEW.arrival_type := 'OTA';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6) Create trigger to call the function
DROP TRIGGER IF EXISTS trg_set_arrival_type_from_ota ON public.bookings;
CREATE TRIGGER trg_set_arrival_type_from_ota
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_arrival_type_from_ota();

-- 7) Update existing bookings where ota_company is not null to set arrival_type to OTA
UPDATE public.bookings 
SET arrival_type = 'OTA' 
WHERE ota_company IS NOT NULL 
  AND TRIM(ota_company) != '' 
  AND arrival_type != 'OTA';

-- 8) Normalize existing arrival_type values to match our constraint
UPDATE public.bookings 
SET arrival_type = CASE 
  WHEN LOWER(arrival_type) IN ('walk_in', 'walk-in', 'walkin') THEN 'walk_in'
  WHEN LOWER(arrival_type) IN ('phone', 'telephone', 'call') THEN 'phone'
  WHEN LOWER(arrival_type) IN ('online', 'web', 'website', 'internet') THEN 'online'
  WHEN LOWER(arrival_type) IN ('ota', 'booking.com', 'expedia', 'agoda', 'makemytrip', 'goibibo', 'yatra') THEN 'OTA'
  WHEN LOWER(arrival_type) IN ('agent', 'travel_agent', 'travel agent') THEN 'agent'
  WHEN LOWER(arrival_type) IN ('corporate', 'company', 'business') THEN 'corporate'
  ELSE 'walk_in' -- Default fallback for unknown values
END
WHERE arrival_type IS NOT NULL;

-- 9) Add constraint to ensure arrival_type values are valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_arrival_type_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_arrival_type_check
      CHECK (arrival_type IN ('walk_in', 'phone', 'online', 'OTA', 'agent', 'corporate'));
  END IF;
END $$;

-- 10) Update add_payment_transaction function to remove references to dropped columns
CREATE OR REPLACE FUNCTION public.add_payment_transaction(
  p_booking_id uuid, 
  p_amount numeric, 
  p_payment_method character varying, 
  p_transaction_type character varying, 
  p_collected_by uuid DEFAULT NULL::uuid, 
  p_reference_number character varying DEFAULT NULL::character varying, 
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    transaction_id UUID;
BEGIN
    -- Insert payment transaction
    INSERT INTO payment_transactions (
        booking_id,
        amount,
        payment_method,
        transaction_type,
        collected_by,
        reference_number,
        notes
    ) VALUES (
        p_booking_id,
        p_amount,
        p_payment_method,
        p_transaction_type,
        p_collected_by,
        p_reference_number,
        p_notes
    ) RETURNING id INTO transaction_id;
    
    -- Log the payment collection
    IF p_collected_by IS NOT NULL THEN
        INSERT INTO staff_logs (
            hotel_id,
            staff_id,
            action,
            details,
            ip_address
        ) VALUES (
            '550e8400-e29b-41d4-a716-446655440000',
            p_collected_by,
            'payment_collected',
            format('Collected %s payment of ₹%s via %s for booking %s', 
                   p_transaction_type, p_amount, p_payment_method, p_booking_id)
        );
    END IF;
    
    RETURN transaction_id;
END;
$$;

-- 11) Update update_guest_stats function to use booking_payment_breakdown.total_amount
CREATE OR REPLACE FUNCTION public.update_guest_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update guest statistics when a booking is completed
    IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
        UPDATE guests 
        SET 
            total_stays = total_stays + 1,
            total_spent = total_spent + COALESCE(
              (SELECT total_amount FROM booking_payment_breakdown WHERE booking_id = NEW.id), 
              0
            ),
            last_stay_date = NEW.check_out
        WHERE id = NEW.guest_id;
        
        -- Insert visit record
        INSERT INTO guest_visits (
            guest_id, 
            booking_id, 
            check_in_date, 
            check_out_date, 
            room_type,
            total_amount
        ) VALUES (
            NEW.guest_id,
            NEW.id,
            NEW.check_in,
            NEW.check_out,
            (SELECT rt.name FROM rooms r 
             JOIN room_types rt ON r.room_type_id = rt.id 
             WHERE r.id = NEW.room_id),
            COALESCE(
              (SELECT total_amount FROM booking_payment_breakdown WHERE booking_id = NEW.id), 
              0
            )
        );
    END IF;
    RETURN NEW;
END;
$$;
