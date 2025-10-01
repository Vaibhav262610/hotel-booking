-- Add per-room rate and nights to booking_rooms, aggregate to bookings and breakdown

-- 1) Add columns to booking_rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_rooms' AND column_name = 'room_rate'
  ) THEN
    ALTER TABLE public.booking_rooms
      ADD COLUMN room_rate numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_rooms' AND column_name = 'expected_nights'
  ) THEN
    ALTER TABLE public.booking_rooms
      ADD COLUMN expected_nights integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_rooms' AND column_name = 'room_total'
  ) THEN
    ALTER TABLE public.booking_rooms
      ADD COLUMN room_total numeric(10,2);
  END IF;
END $$;

-- 2) Constraints for non-negative values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_rooms_room_rate_non_negative'
  ) THEN
    ALTER TABLE public.booking_rooms
      ADD CONSTRAINT booking_rooms_room_rate_non_negative
      CHECK (room_rate IS NULL OR room_rate >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_rooms_expected_nights_non_negative'
  ) THEN
    ALTER TABLE public.booking_rooms
      ADD CONSTRAINT booking_rooms_expected_nights_non_negative
      CHECK (expected_nights IS NULL OR expected_nights >= 0);
  END IF;
END $$;

-- 3) Add bookings.room_total_amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'room_total_amount'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN room_total_amount numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 4) Function: recompute booking room totals and sync breakdown
CREATE OR REPLACE FUNCTION public.recompute_booking_room_totals(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_sum numeric(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(room_total),0) INTO v_sum
  FROM public.booking_rooms WHERE booking_id = p_booking_id;

  UPDATE public.bookings SET room_total_amount = v_sum WHERE id = p_booking_id;

  INSERT INTO public.booking_payment_breakdown AS bpb (booking_id, total_amount, outstanding_amount)
  VALUES (p_booking_id, v_sum, GREATEST(v_sum - COALESCE((
    SELECT COALESCE(SUM(amount),0) FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND status = 'completed' AND transaction_type IN ('advance','receipt')
  ),0), 0))
  ON CONFLICT (booking_id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    -- keep outstanding_amount consistent; it will be refreshed by other triggers too
    outstanding_amount = GREATEST(EXCLUDED.total_amount - COALESCE((
      SELECT COALESCE(SUM(amount),0) FROM public.payment_transactions
      WHERE booking_id = p_booking_id AND status = 'completed' AND transaction_type IN ('advance','receipt')
    ),0), 0),
    updated_at = now();
END;
$$;

-- 5) Function: normalize booking_rooms values on write
CREATE OR REPLACE FUNCTION public.normalize_booking_room_values()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate numeric(10,2);
  v_nights integer;
BEGIN
  -- If room_rate not provided, snapshot from rooms.price
  IF NEW.room_rate IS NULL THEN
    SELECT price INTO v_rate FROM public.rooms WHERE id = NEW.room_id;
    NEW.room_rate := COALESCE(v_rate, 0);
  END IF;

  -- If expected_nights not provided, copy from bookings.planned_nights
  IF NEW.expected_nights IS NULL THEN
    SELECT planned_nights INTO v_nights FROM public.bookings WHERE id = NEW.booking_id;
    NEW.expected_nights := COALESCE(v_nights, 0);
  END IF;

  -- Compute room_total (allow override by explicit NEW.room_total if provided)
  IF NEW.room_total IS NULL THEN
    NEW.room_total := ROUND(COALESCE(NEW.room_rate,0) * COALESCE(NEW.expected_nights,0), 2);
  END IF;

  RETURN NEW;
END;
$$;

-- 6) Triggers on booking_rooms to normalize and recompute
DROP TRIGGER IF EXISTS trg_booking_rooms_before_ins_upd_normalize ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_before_ins_upd_normalize
BEFORE INSERT OR UPDATE ON public.booking_rooms
FOR EACH ROW EXECUTE FUNCTION public.normalize_booking_room_values();

-- define trigger function first, then create trigger below

-- Helper trigger function to route booking id on I/U/D
CREATE OR REPLACE FUNCTION public.trg_recompute_booking_room_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recompute_booking_room_totals(NEW.booking_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.booking_id IS DISTINCT FROM OLD.booking_id THEN
      PERFORM public.recompute_booking_room_totals(OLD.booking_id);
    END IF;
    PERFORM public.recompute_booking_room_totals(NEW.booking_id);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_booking_room_totals(OLD.booking_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Now create the recompute trigger
DROP TRIGGER IF EXISTS trg_booking_rooms_after_change_recompute ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_after_change_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_booking_room_totals();

-- 7) Backfill existing data
DO $$
DECLARE rec RECORD;
BEGIN
  -- Fill missing room_rate from rooms.price
  UPDATE public.booking_rooms br
  SET room_rate = COALESCE(br.room_rate, r.price)
  FROM public.rooms r
  WHERE br.room_id = r.id AND (br.room_rate IS NULL);

  -- Fill expected_nights from bookings.planned_nights
  UPDATE public.booking_rooms br
  SET expected_nights = COALESCE(br.expected_nights, b.planned_nights)
  FROM public.bookings b
  WHERE br.booking_id = b.id AND (br.expected_nights IS NULL);

  -- Compute room_totals where null
  UPDATE public.booking_rooms
  SET room_total = ROUND(COALESCE(room_rate,0) * COALESCE(expected_nights,0), 2)
  WHERE room_total IS NULL;

  -- Recompute per booking
  FOR rec IN SELECT DISTINCT booking_id FROM public.booking_rooms LOOP
    PERFORM public.recompute_booking_room_totals(rec.booking_id);
  END LOOP;
END $$;


