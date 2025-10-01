-- Fix add_payment_transaction function to remove references to dropped columns
-- The function currently references b.total_amount which was moved to booking_payment_breakdown

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
            details
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

-- Log the fix
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
  'Fixed add_payment_transaction function by removing references to dropped b.total_amount column',
  now()
) ON CONFLICT DO NOTHING;
