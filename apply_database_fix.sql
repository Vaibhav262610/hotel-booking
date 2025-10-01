-- Fix outstanding amount calculation to use taxed_total_amount
-- This ensures consistency between displayed total amount and outstanding amount

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
  -- Get total from breakdown if present, otherwise fallback to 0
  -- Use taxed_total_amount if available, otherwise total_amount
  SELECT COALESCE(bpb.taxed_total_amount, bpb.total_amount, 0) INTO total
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

-- Also update the other function that calculates outstanding amounts
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
    outstanding_amount = GREATEST(EXCLUDED.total_amount - COALESCE((
      SELECT COALESCE(SUM(amount),0) FROM public.payment_transactions
      WHERE booking_id = p_booking_id AND status = 'completed' AND transaction_type IN ('advance','receipt')
    ),0), 0),
    updated_at = now();
END;
$$;

-- Recalculate all existing bookings to fix current data
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT booking_id FROM public.booking_payment_breakdown LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.booking_id);
  END LOOP;
END $$;
