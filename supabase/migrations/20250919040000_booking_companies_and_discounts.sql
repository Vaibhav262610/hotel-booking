-- Booking companies, plans, channels and discount support
-- Implements: company billing, booking-level + room-level discounts, meal plans (FK),
-- simple rate plans per room type, OTA channel only for now, pax fields on booking_rooms

-- 1) Enums
DO $$
BEGIN
  -- bill_to_type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_to_type') THEN
    CREATE TYPE public.bill_to_type AS ENUM ('guest', 'company');
  END IF;

  -- booking_channel (keep OTA option plus direct/corporate for future)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_channel') THEN
    CREATE TYPE public.booking_channel AS ENUM ('direct', 'ota', 'corporate');
  END IF;

  -- reserved_status aligned to UI
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reserved_status') THEN
    CREATE TYPE public.reserved_status AS ENUM ('unconfirmed', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
  END IF;

  -- check_in_mode
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'check_in_mode') THEN
    CREATE TYPE public.check_in_mode AS ENUM ('day', 'night');
  END IF;

  -- discount_type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
    CREATE TYPE public.discount_type AS ENUM ('none', 'percent', 'flat');
  END IF;
END $$;

-- 2) Companies table (required when bill_to_type = company)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  gst_number text,
  gst_type text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  country text,
  contact_name text,
  contact_phone text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Meal plans and rate plans (simple)
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code text NOT NULL UNIQUE, -- EP/CP/MAP/AP etc.
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_plans (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_type_id, name)
);

-- 4) Extend bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='bill_to'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN bill_to public.bill_to_type DEFAULT 'guest'::public.bill_to_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='company_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='booking_channel'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN booking_channel public.booking_channel DEFAULT 'direct'::public.booking_channel;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='reserved_status'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN reserved_status public.reserved_status DEFAULT 'unconfirmed'::public.reserved_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='reserved_by_staff_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN reserved_by_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='check_in_mode'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN check_in_mode public.check_in_mode DEFAULT 'day'::public.check_in_mode;
  END IF;

  -- Booking-level discount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='discount_type'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN discount_type public.discount_type DEFAULT 'none'::public.discount_type;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='discount_value'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN discount_value numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- Preferred/notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='preferred_rooms'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN preferred_rooms text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='special_instructions'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN special_instructions text;
  END IF;

  -- GST snapshot overrides at booking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='gst_number'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN gst_number text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='gst_type'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN gst_type text;
  END IF;

  -- Arrival fields from UI header
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='arrival_city'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN arrival_city text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='payment_method_pref'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_method_pref text;
  END IF;
END $$;

-- 5) Extend booking_rooms for pax, plans, discounts and tax flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='adults'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN adults smallint DEFAULT 1;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='children'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN children smallint DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='extra_beds'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN extra_beds smallint DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='meal_plan_id'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN meal_plan_id uuid REFERENCES public.meal_plans(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='rate_plan_id'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN rate_plan_id uuid REFERENCES public.rate_plans(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='apply_inclusive_tax'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN apply_inclusive_tax boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='discount_type'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN discount_type public.discount_type DEFAULT 'none'::public.discount_type;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='booking_rooms' AND column_name='discount_value'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN discount_value numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_company_id ON public.bookings (company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reserved_status ON public.bookings (reserved_status);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_meal_plan_id ON public.booking_rooms (meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_rate_plan_id ON public.booking_rooms (rate_plan_id);

-- 7) Comments
COMMENT ON TABLE public.companies IS 'Corporate customers for billing on behalf of guest';
COMMENT ON TABLE public.meal_plans IS 'Normalized meal plans (EP/CP/MAP/AP etc.)';
COMMENT ON TABLE public.rate_plans IS 'Simple named rate plans per room type';
COMMENT ON COLUMN public.bookings.bill_to IS 'Who is billed for this booking: guest or company';
COMMENT ON COLUMN public.bookings.company_id IS 'Company billed when bill_to=company';
COMMENT ON COLUMN public.bookings.discount_type IS 'Booking-level discount type';
COMMENT ON COLUMN public.bookings.discount_value IS 'Booking-level discount value';
COMMENT ON COLUMN public.booking_rooms.discount_type IS 'Room-level discount type';
COMMENT ON COLUMN public.booking_rooms.discount_value IS 'Room-level discount value';
COMMENT ON COLUMN public.booking_rooms.adults IS 'Pax per room (adults)';
COMMENT ON COLUMN public.booking_rooms.children IS 'Pax per room (children)';
COMMENT ON COLUMN public.booking_rooms.extra_beds IS 'Number of extra beds';


