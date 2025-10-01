-- Temporarily disable the problematic trigger that causes advance posting to fail
-- The trigger calls recompute_booking_payment_breakdown which references dropped columns

DROP TRIGGER IF EXISTS trg_payment_transactions_update_bpb ON public.payment_transactions;

-- Log the change
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
  'Disabled payment transactions trigger to fix advance posting functionality', 
  now()
) ON CONFLICT DO NOTHING;
