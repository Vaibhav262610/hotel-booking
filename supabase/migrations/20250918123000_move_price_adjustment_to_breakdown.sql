-- Move price_adjustment from bookings to booking_payment_breakdown and update dependent objects

-- 1) Add column on breakdown
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_payment_breakdown' AND column_name = 'price_adjustment'
  ) THEN
    ALTER TABLE public.booking_payment_breakdown
      ADD COLUMN price_adjustment numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2) Backfill breakdown.price_adjustment from bookings.price_adjustment
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'price_adjustment'
  ) THEN
    UPDATE public.booking_payment_breakdown bpb
    SET price_adjustment = COALESCE(b.price_adjustment, 0)
    FROM public.bookings b
    WHERE bpb.booking_id = b.id;
  END IF;
END $$;

-- 3) Update recompute function to preserve price_adjustment in breakdown
CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  a_cash numeric(10,2) := 0; a_card numeric(10,2) := 0; a_upi numeric(10,2) := 0; a_bank numeric(10,2) := 0;
  r_cash numeric(10,2) := 0; r_card numeric(10,2) := 0; r_upi numeric(10,2) := 0; r_bank numeric(10,2) := 0;
  total numeric(10,2) := 0;
  total_paid numeric(10,2) := 0;
  adj numeric(10,2) := 0;
BEGIN
  -- Get total and price adjustment from breakdown if present, otherwise fallback to bookings (for initial backfill)
  SELECT 
    COALESCE(bpb.total_amount, b.total_amount, 0),
    COALESCE(bpb.price_adjustment, b.price_adjustment, 0)
  INTO total, adj
  FROM public.bookings b
  LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
  WHERE b.id = p_booking_id;

  WITH sums AS (
    SELECT LOWER(transaction_type) AS ttype, LOWER(payment_method) AS mthd, COALESCE(SUM(amount),0) AS amt
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND status = 'completed'
    GROUP BY 1,2
  )
  SELECT
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='cash' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='card' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='upi' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='bank' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='cash' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='card' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='upi' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='bank' THEN amt END),0)
  INTO a_cash, a_card, a_upi, a_bank, r_cash, r_card, r_upi, r_bank
  FROM sums;

  total_paid := a_cash + a_card + a_upi + a_bank + r_cash + r_card + r_upi + r_bank;

  INSERT INTO public.booking_payment_breakdown AS bpb (
    booking_id, total_amount, price_adjustment, advance_cash, advance_card, advance_upi, advance_bank,
    receipt_cash, receipt_card, receipt_upi, receipt_bank, outstanding_amount, updated_at
  ) VALUES (
    p_booking_id, total, adj, a_cash, a_card, a_upi, a_bank, r_cash, r_card, r_upi, r_bank, GREATEST(total - total_paid, 0), now()
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    price_adjustment = EXCLUDED.price_adjustment,
    advance_cash = EXCLUDED.advance_cash,
    advance_card = EXCLUDED.advance_card,
    advance_upi = EXCLUDED.advance_upi,
    advance_bank = EXCLUDED.advance_bank,
    receipt_cash = EXCLUDED.receipt_cash,
    receipt_card = EXCLUDED.receipt_card,
    receipt_upi = EXCLUDED.receipt_upi,
    receipt_bank = EXCLUDED.receipt_bank,
    outstanding_amount = EXCLUDED.outstanding_amount,
    updated_at = now();
END;
$$;

-- 4) Recreate booking_payment_summary to reference breakdown.price_adjustment
DROP VIEW IF EXISTS public.booking_payment_summary CASCADE;
CREATE OR REPLACE VIEW public.booking_payment_summary AS
SELECT 
  b.id AS booking_id,
  b.booking_number,
  COALESCE(bpb.total_amount, 0) AS total_amount,
  COALESCE(bpb.price_adjustment, 0) AS price_adjustment,
  COALESCE(SUM(CASE WHEN pt.transaction_type = 'advance' THEN pt.amount ELSE 0 END),0) AS total_advance_paid,
  COALESCE(SUM(CASE WHEN pt.transaction_type = 'receipt' THEN pt.amount ELSE 0 END),0) AS total_receipt_paid,
  COUNT(pt.id) AS total_transactions,
  STRING_AGG(DISTINCT pt.payment_method::text, ', ') AS payment_methods_used
FROM public.bookings b
LEFT JOIN public.payment_transactions pt ON b.id = pt.booking_id
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
GROUP BY b.id, b.booking_number, bpb.total_amount, bpb.price_adjustment;

-- 5) Update helper functions to use breakdown.price_adjustment if any reference remains
-- (No direct arithmetic change needed; price_adjustment remains an attribute)

-- 6) Drop bookings.price_adjustment
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'price_adjustment'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN price_adjustment;
  END IF;
END $$;


