-- Fix payment and charge calculations by including charge_items in totals
-- Re-enable payment triggers and fix recompute function

-- 1) Fix recompute function to include charge_items and use correct column references
CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  a_cash numeric(10,2) := 0; a_card numeric(10,2) := 0; a_upi numeric(10,2) := 0; a_bank numeric(10,2) := 0;
  r_cash numeric(10,2) := 0; r_card numeric(10,2) := 0; r_upi numeric(10,2) := 0; r_bank numeric(10,2) := 0;
  room_total numeric(10,2) := 0;
  charges_total numeric(10,2) := 0;
  final_total_amount numeric(10,2) := 0;
  total_paid numeric(10,2) := 0;
  adj numeric(10,2) := 0;
BEGIN
  -- Get room total and existing price adjustment
  SELECT 
    COALESCE(b.room_total_amount, 0),
    COALESCE(bpb.price_adjustment, 0)
  INTO room_total, adj
  FROM public.bookings b
  LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
  WHERE b.id = p_booking_id;

  -- Get charge items total
  SELECT COALESCE(SUM(total_amount), 0) INTO charges_total
  FROM public.charge_items
  WHERE booking_id = p_booking_id;

  -- Calculate total amount (room + charges)
  final_total_amount := room_total + charges_total;

  -- Calculate payment breakdown by method and type
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

  -- Insert or update breakdown with correct totals
  INSERT INTO public.booking_payment_breakdown AS bpb (
    booking_id, total_amount, price_adjustment, advance_cash, advance_card, advance_upi, advance_bank,
    receipt_cash, receipt_card, receipt_upi, receipt_bank, outstanding_amount, updated_at
  ) VALUES (
    p_booking_id, final_total_amount, adj, a_cash, a_card, a_upi, a_bank, r_cash, r_card, r_upi, r_bank, GREATEST(final_total_amount - total_paid, 0), now()
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

-- 2) Re-enable payment transactions trigger
CREATE TRIGGER trg_payment_transactions_update_bpb
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.trg_bpb_after_change();

-- 3) Add charge items trigger to update totals when charges change
CREATE TRIGGER trg_charge_items_update_bpb
    AFTER INSERT OR UPDATE OR DELETE ON public.charge_items
    FOR EACH ROW EXECUTE FUNCTION public.trg_bpb_after_change();

-- 4) Recalculate all existing bookings to fix current data
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT booking_id FROM public.booking_payment_breakdown LOOP
    PERFORM public.recompute_booking_payment_breakdown(rec.booking_id);
  END LOOP;
END $$;
