-- Normalize payments, add breakdown table, triggers, backfill, and update summary view

-- 1) Normalize existing payment method and transaction type values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'payment_method'
  ) THEN
    UPDATE public.payment_transactions
    SET payment_method = CASE LOWER(TRIM(payment_method))
      WHEN 'upi' THEN 'upi'
      WHEN 'gpay' THEN 'upi'
      WHEN 'phonepe' THEN 'upi'
      WHEN 'paytm' THEN 'upi'
      WHEN 'cash' THEN 'cash'
      WHEN 'card' THEN 'card'
      WHEN 'credit' THEN 'card'
      WHEN 'credit card' THEN 'card'
      WHEN 'debit card' THEN 'card'
      WHEN 'pos' THEN 'card'
      WHEN 'bank' THEN 'bank'
      WHEN 'bank-transfer' THEN 'bank'
      WHEN 'neft' THEN 'bank'
      WHEN 'rtgs' THEN 'bank'
      WHEN 'imps' THEN 'bank'
      WHEN 'online' THEN 'card'
      ELSE LOWER(TRIM(payment_method))
    END
    WHERE payment_method IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'transaction_type'
  ) THEN
    UPDATE public.payment_transactions
    SET transaction_type = CASE LOWER(TRIM(transaction_type))
      WHEN 'remaining' THEN 'receipt'
      WHEN 'advance' THEN 'advance'
      WHEN 'receipt' THEN 'receipt'
      ELSE LOWER(TRIM(transaction_type))
    END
    WHERE transaction_type IS NOT NULL;
  END IF;
END $$;

-- 2) Add CHECK constraints on payment_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_method_check'
  ) THEN
    ALTER TABLE public.payment_transactions
    ADD CONSTRAINT payment_transactions_method_check
    CHECK (LOWER(payment_method) IN ('upi','card','cash','bank')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_type_check'
  ) THEN
    ALTER TABLE public.payment_transactions
    ADD CONSTRAINT payment_transactions_type_check
    CHECK (LOWER(transaction_type) IN ('advance','receipt')) NOT VALID;
  END IF;

  BEGIN
    ALTER TABLE public.payment_transactions VALIDATE CONSTRAINT payment_transactions_method_check;
  EXCEPTION WHEN others THEN NULL; END;

  BEGIN
    ALTER TABLE public.payment_transactions VALIDATE CONSTRAINT payment_transactions_type_check;
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 3) Optional: clear legacy free-text on bookings.payment_method
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    UPDATE public.bookings SET payment_method = NULL WHERE payment_method IS NOT NULL;
  END IF;
END $$;

-- 4) Create breakdown table per booking
CREATE TABLE IF NOT EXISTS public.booking_payment_breakdown (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  advance_cash numeric(10,2) NOT NULL DEFAULT 0,
  advance_card numeric(10,2) NOT NULL DEFAULT 0,
  advance_upi numeric(10,2) NOT NULL DEFAULT 0,
  advance_bank numeric(10,2) NOT NULL DEFAULT 0,
  receipt_cash numeric(10,2) NOT NULL DEFAULT 0,
  receipt_card numeric(10,2) NOT NULL DEFAULT 0,
  receipt_upi numeric(10,2) NOT NULL DEFAULT 0,
  receipt_bank numeric(10,2) NOT NULL DEFAULT 0,
  outstanding_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Function to recompute breakdown
CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  a_cash numeric(10,2) := 0; a_card numeric(10,2) := 0; a_upi numeric(10,2) := 0; a_bank numeric(10,2) := 0;
  r_cash numeric(10,2) := 0; r_card numeric(10,2) := 0; r_upi numeric(10,2) := 0; r_bank numeric(10,2) := 0;
  total numeric(10,2) := 0;
  total_paid numeric(10,2) := 0;
BEGIN
  -- Get total from breakdown if present, otherwise fallback to bookings (for initial backfill)
  -- Use taxed_total_amount if available, otherwise total_amount
  SELECT COALESCE(bpb.taxed_total_amount, bpb.total_amount, b.total_amount, 0) INTO total
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
    booking_id, total_amount, advance_cash, advance_card, advance_upi, advance_bank,
    receipt_cash, receipt_card, receipt_upi, receipt_bank, outstanding_amount, updated_at
  ) VALUES (
    p_booking_id, total, a_cash, a_card, a_upi, a_bank, r_cash, r_card, r_upi, r_bank, GREATEST(total - total_paid, 0), now()
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
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

-- 6) Trigger to keep breakdown in sync
CREATE OR REPLACE FUNCTION public.trg_bpb_after_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recompute_booking_payment_breakdown(NEW.booking_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.booking_id IS DISTINCT FROM OLD.booking_id THEN
      PERFORM public.recompute_booking_payment_breakdown(OLD.booking_id);
    END IF;
    PERFORM public.recompute_booking_payment_breakdown(NEW.booking_id);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_booking_payment_breakdown(OLD.booking_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_transactions_update_bpb ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_update_bpb
AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_bpb_after_change();

-- 7) Backfill breakdown for all existing bookings with transactions
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT booking_id FROM public.payment_transactions WHERE booking_id IS NOT NULL LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.booking_id);
  END LOOP;
  -- Also initialize breakdown rows for bookings without transactions, using their total_amount
  INSERT INTO public.booking_payment_breakdown (booking_id, total_amount, outstanding_amount)
  SELECT b.id, COALESCE(b.total_amount,0), COALESCE(b.total_amount,0)
  FROM public.bookings b
  WHERE NOT EXISTS (
    SELECT 1 FROM public.booking_payment_breakdown x WHERE x.booking_id = b.id
  );
END $$;

-- 8) Refresh booking_payment_summary view to use 'receipt' and breakdown.total_amount
DROP VIEW IF EXISTS public.booking_payment_summary CASCADE;
CREATE OR REPLACE VIEW public.booking_payment_summary AS
SELECT 
  b.id AS booking_id,
  b.booking_number,
  COALESCE(bpb.total_amount, 0) AS total_amount,
  b.advance_amount,
  b.final_amount,
  b.price_adjustment,
  COALESCE(SUM(CASE WHEN pt.transaction_type = 'advance' THEN pt.amount ELSE 0 END),0) AS total_advance_paid,
  COALESCE(SUM(CASE WHEN pt.transaction_type = 'receipt' THEN pt.amount ELSE 0 END),0) AS total_receipt_paid,
  COUNT(pt.id) AS total_transactions,
  STRING_AGG(DISTINCT pt.payment_method::text, ', ') AS payment_methods_used
FROM public.bookings b
LEFT JOIN public.payment_transactions pt ON b.id = pt.booking_id
LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
GROUP BY b.id, b.booking_number, bpb.total_amount, b.advance_amount, b.final_amount, b.price_adjustment;

-- 9) Helpful index for breakdown
CREATE INDEX IF NOT EXISTS idx_booking_payment_breakdown_booking_id ON public.booking_payment_breakdown (booking_id);

-- 10) Update calculate_remaining_balance to use breakdown totals
CREATE OR REPLACE FUNCTION public.calculate_remaining_balance(booking_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  remaining numeric(10,2) := 0;
  total numeric(10,2) := 0;
  total_paid numeric(10,2) := 0;
BEGIN
  SELECT COALESCE(total_amount,0) INTO total FROM public.booking_payment_breakdown WHERE booking_id = booking_uuid;
  IF total IS NULL THEN total := 0; END IF;

  SELECT COALESCE(SUM(amount),0) INTO total_paid
  FROM public.payment_transactions
  WHERE booking_id = booking_uuid AND status = 'completed' AND transaction_type IN ('advance','receipt');

  remaining := GREATEST(total - total_paid, 0);
  RETURN remaining;
END;
$$;

-- 11) Move total_amount from bookings to breakdown, then drop from bookings
DO $$
BEGIN
  -- Backfill breakdown.total_amount from bookings if breakdown has zero
  UPDATE public.booking_payment_breakdown bpb
  SET total_amount = COALESCE(b.total_amount, bpb.total_amount)
  FROM public.bookings b
  WHERE bpb.booking_id = b.id AND COALESCE(bpb.total_amount,0) = 0;

  -- Finally drop bookings.total_amount
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN total_amount;
  END IF;
END $$;


