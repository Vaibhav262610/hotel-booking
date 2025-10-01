-- Create tax_types table
CREATE TABLE IF NOT EXISTS public.tax_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tax columns to booking_payment_breakdown table
ALTER TABLE public.booking_payment_breakdown 
ADD COLUMN IF NOT EXISTS gst_tax_type_id UUID REFERENCES public.tax_types(id),
ADD COLUMN IF NOT EXISTS cgst_tax_type_id UUID REFERENCES public.tax_types(id),
ADD COLUMN IF NOT EXISTS sgst_tax_type_id UUID REFERENCES public.tax_types(id),
ADD COLUMN IF NOT EXISTS luxury_tax_type_id UUID REFERENCES public.tax_types(id),
ADD COLUMN IF NOT EXISTS service_charge_tax_type_id UUID REFERENCES public.tax_types(id),
ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS luxury_tax_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxed_total_amount NUMERIC(10,2) DEFAULT 0;

-- Insert default tax rates
INSERT INTO public.tax_types (name, rate, is_active) VALUES
('GST', 12.00, true),
('CGST', 6.00, true),
('SGST', 6.00, true),
('Luxury Tax', 5.00, true),
('Service Charge', 10.00, true)
ON CONFLICT (name) DO NOTHING;

-- Create function to calculate taxes
CREATE OR REPLACE FUNCTION public.calculate_booking_taxes(p_booking_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_amount NUMERIC(10,2);
    v_gst_rate NUMERIC(5,2);
    v_cgst_rate NUMERIC(5,2);
    v_sgst_rate NUMERIC(5,2);
    v_luxury_tax_rate NUMERIC(5,2);
    v_service_charge_rate NUMERIC(5,2);
    v_gst_id UUID;
    v_cgst_id UUID;
    v_sgst_id UUID;
    v_luxury_tax_id UUID;
    v_service_charge_id UUID;
    v_gst_amount NUMERIC(10,2);
    v_cgst_amount NUMERIC(10,2);
    v_sgst_amount NUMERIC(10,2);
    v_luxury_tax_amount NUMERIC(10,2);
    v_service_charge_amount NUMERIC(10,2);
    v_total_tax_amount NUMERIC(10,2);
    v_taxed_total_amount NUMERIC(10,2);
BEGIN
    -- Get total amount from booking_payment_breakdown
    SELECT total_amount INTO v_total_amount
    FROM public.booking_payment_breakdown
    WHERE booking_id = p_booking_id;
    
    -- Get tax rates and IDs
    SELECT id, rate INTO v_gst_id, v_gst_rate FROM public.tax_types WHERE name = 'GST' AND is_active = true;
    SELECT id, rate INTO v_cgst_id, v_cgst_rate FROM public.tax_types WHERE name = 'CGST' AND is_active = true;
    SELECT id, rate INTO v_sgst_id, v_sgst_rate FROM public.tax_types WHERE name = 'SGST' AND is_active = true;
    SELECT id, rate INTO v_luxury_tax_id, v_luxury_tax_rate FROM public.tax_types WHERE name = 'Luxury Tax' AND is_active = true;
    SELECT id, rate INTO v_service_charge_id, v_service_charge_rate FROM public.tax_types WHERE name = 'Service Charge' AND is_active = true;
    
    -- Calculate tax amounts
    v_gst_amount := (v_total_amount * COALESCE(v_gst_rate, 0)) / 100;
    v_cgst_amount := (v_total_amount * COALESCE(v_cgst_rate, 0)) / 100;
    v_sgst_amount := (v_total_amount * COALESCE(v_sgst_rate, 0)) / 100;
    v_luxury_tax_amount := (v_total_amount * COALESCE(v_luxury_tax_rate, 0)) / 100;
    v_service_charge_amount := (v_total_amount * COALESCE(v_service_charge_rate, 0)) / 100;
    
    -- Calculate totals
    v_total_tax_amount := v_gst_amount + v_cgst_amount + v_sgst_amount + v_luxury_tax_amount + v_service_charge_amount;
    v_taxed_total_amount := v_total_amount + v_total_tax_amount;
    
    -- Update booking_payment_breakdown with tax information
    UPDATE public.booking_payment_breakdown
    SET 
        gst_tax_type_id = v_gst_id,
        cgst_tax_type_id = v_cgst_id,
        sgst_tax_type_id = v_sgst_id,
        luxury_tax_type_id = v_luxury_tax_id,
        service_charge_tax_type_id = v_service_charge_id,
        gst_amount = v_gst_amount,
        cgst_amount = v_cgst_amount,
        sgst_amount = v_sgst_amount,
        luxury_tax_amount = v_luxury_tax_amount,
        service_charge_amount = v_service_charge_amount,
        total_tax_amount = v_total_tax_amount,
        taxed_total_amount = v_taxed_total_amount,
        updated_at = NOW()
    WHERE booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate taxes when total_amount changes
CREATE OR REPLACE FUNCTION public.trigger_calculate_booking_taxes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate if total_amount changed
    IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
        PERFORM public.calculate_booking_taxes(NEW.booking_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_calculate_booking_taxes ON public.booking_payment_breakdown;
CREATE TRIGGER trg_calculate_booking_taxes
    AFTER UPDATE OF total_amount ON public.booking_payment_breakdown
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_booking_taxes();

-- Update existing bookings with tax calculations
DO $$
DECLARE
    booking_record RECORD;
BEGIN
    FOR booking_record IN 
        SELECT booking_id FROM public.booking_payment_breakdown 
        WHERE total_amount > 0
    LOOP
        PERFORM public.calculate_booking_taxes(booking_record.booking_id);
    END LOOP;
END $$;
