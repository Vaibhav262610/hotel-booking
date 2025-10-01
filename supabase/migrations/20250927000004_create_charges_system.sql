-- Create charges posting system with products and charge items tables
-- This enables recording additional charges (food, beverages, services) to guest bills

-- 1) Create products table for chargeable items
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  price numeric(10,2) NOT NULL,
  category text DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Create charge_items table to record charges per booking
CREATE TABLE IF NOT EXISTS public.charge_items (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  rate numeric(10,2) NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  cgst_amount numeric(10,2) DEFAULT 0,
  sgst_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure positive values
  CHECK (quantity > 0),
  CHECK (rate >= 0),
  CHECK (total_amount >= 0)
);

-- 3) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_charge_items_booking_id ON public.charge_items (booking_id);
CREATE INDEX IF NOT EXISTS idx_charge_items_product_id ON public.charge_items (product_id);

-- 4) Seed products with common hotel charges
INSERT INTO public.products (name, price, category) VALUES
('Lays', 20.00, 'snacks'),
('Coke', 25.00, 'beverages'),
('Pepsi', 25.00, 'beverages'),
('7UP', 25.00, 'beverages'),
('Water', 15.00, 'beverages'),
('Miranda', 25.00, 'beverages')
ON CONFLICT (name) DO NOTHING;

-- 5) Add comments for documentation
COMMENT ON TABLE public.products IS 'Available products/services that can be charged to guest bills';
COMMENT ON TABLE public.charge_items IS 'Individual charge line items recorded against bookings';
COMMENT ON COLUMN public.charge_items.total_amount IS 'Total amount for this line item (quantity × rate + taxes)';

-- 6) Log the enhancement
INSERT INTO public.staff_logs (
  hotel_id,
  staff_id,
  action,
  details,
  created_at
) VALUES (
  (SELECT id FROM public.hotels LIMIT 1),
  NULL,
  'SYSTEM_ENHANCEMENT',
  'Created charges posting system with products and charge items tables',
  now()
) ON CONFLICT DO NOTHING;
