 -- Create comprehensive room availability management system
-- Based on README specifications with individual room booking and room-type availability

-- 1) Enable pgcrypto if not already (for gen_random_uuid)
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END $$;

-- 2) Create room_availability table for daily availability tracking per room type
CREATE TABLE IF NOT EXISTS public.room_availability (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    availability_date date NOT NULL,
    total_rooms integer NOT NULL,
    occupied_rooms integer DEFAULT 0,
    blocked_rooms integer DEFAULT 0,
    maintenance_rooms integer DEFAULT 0,
    available_rooms integer GENERATED ALWAYS AS (total_rooms - occupied_rooms - blocked_rooms - maintenance_rooms) STORED,
    overbooked_rooms integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(room_type_id, availability_date)
);

-- 3) Create daily_occupancy_metrics table for arrivals, inhouse, and checkout tracking
CREATE TABLE IF NOT EXISTS public.daily_occupancy_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    metric_date date NOT NULL,
    total_inventory integer NOT NULL,
    arrivals_count integer DEFAULT 0,
    inhouse_count integer DEFAULT 0,
    checkout_count integer DEFAULT 0,
    blocked_count integer DEFAULT 0,
    maintenance_count integer DEFAULT 0,
    net_occupancy integer GENERATED ALWAYS AS (arrivals_count + inhouse_count - checkout_count) STORED,
    available_count integer GENERATED ALWAYS AS (total_inventory - arrivals_count - inhouse_count + checkout_count - blocked_count - maintenance_count) STORED,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(room_type_id, metric_date)
);

-- 4) Create daily_channel_summary table for channel-specific booking tracking
CREATE TABLE IF NOT EXISTS public.daily_channel_summary (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_type varchar(50) NOT NULL, -- 'direct', 'ota', 'corporate'
    summary_date date NOT NULL,
    room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    total_bookings integer DEFAULT 0,
    direct_bookings integer DEFAULT 0,
    ota_bookings integer DEFAULT 0,
    corporate_bookings integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(channel_type, summary_date, room_type_id)
);

-- 5) Create availability_calendar table for multi-date view and forecasting
CREATE TABLE IF NOT EXISTS public.availability_calendar (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_date date NOT NULL,
    day_of_week varchar(10),
    is_weekend boolean DEFAULT false,
    is_holiday boolean DEFAULT false,
    season_type varchar(20),
    demand_forecast decimal(5,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(calendar_date)
);

-- 6) Create active_stays table for current in-house guest tracking
CREATE TABLE IF NOT EXISTS public.active_stays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    stay_date date NOT NULL,
    status varchar(20) DEFAULT 'in_house', -- 'checked_in', 'in_house', 'checked_out'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(booking_id, stay_date)
);

-- 7) Enhance existing tables with required columns for availability system

-- Add room_type_id to rooms table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'room_type_id'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN room_type_id uuid REFERENCES public.room_types(id);
  END IF;
END $$;

-- Add maintenance status to rooms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'maintenance_status'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN maintenance_status varchar(20) DEFAULT 'available';
  END IF;
END $$;

-- Add last maintenance date to rooms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'last_maintenance_date'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN last_maintenance_date date;
  END IF;
END $$;

-- Add channel tracking to booking_rooms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_rooms' AND column_name = 'booking_channel'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN booking_channel varchar(50) DEFAULT 'direct';
  END IF;
END $$;

-- Add overbooking flag to booking_rooms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_rooms' AND column_name = 'is_overbooked'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN is_overbooked boolean DEFAULT false;
  END IF;
END $$;

-- Add auto-assignment flag to booking_rooms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_rooms' AND column_name = 'auto_assigned'
  ) THEN
    ALTER TABLE public.booking_rooms ADD COLUMN auto_assigned boolean DEFAULT false;
  END IF;
END $$;

-- 8) Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_room_availability_room_type_date ON public.room_availability (room_type_id, availability_date);
CREATE INDEX IF NOT EXISTS idx_room_availability_date ON public.room_availability (availability_date);
CREATE INDEX IF NOT EXISTS idx_daily_occupancy_metrics_room_type_date ON public.daily_occupancy_metrics (room_type_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_occupancy_metrics_date ON public.daily_occupancy_metrics (metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_channel_summary_channel_date ON public.daily_channel_summary (channel_type, summary_date);
CREATE INDEX IF NOT EXISTS idx_daily_channel_summary_room_type ON public.daily_channel_summary (room_type_id);
CREATE INDEX IF NOT EXISTS idx_availability_calendar_date ON public.availability_calendar (calendar_date);
CREATE INDEX IF NOT EXISTS idx_active_stays_booking_date ON public.active_stays (booking_id, stay_date);
CREATE INDEX IF NOT EXISTS idx_active_stays_room_type_date ON public.active_stays (room_type_id, stay_date);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON public.rooms (room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_maintenance_status ON public.rooms (maintenance_status);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_channel ON public.booking_rooms (booking_channel);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_overbooked ON public.booking_rooms (is_overbooked);

-- 9) Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10) Create triggers for updated_at on all new tables
CREATE TRIGGER trg_room_availability_updated_at
  BEFORE UPDATE ON public.room_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER trg_daily_occupancy_metrics_updated_at
  BEFORE UPDATE ON public.daily_occupancy_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER trg_daily_channel_summary_updated_at
  BEFORE UPDATE ON public.daily_channel_summary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER trg_availability_calendar_updated_at
  BEFORE UPDATE ON public.availability_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER trg_active_stays_updated_at
  BEFORE UPDATE ON public.active_stays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 11) Add comments for documentation
COMMENT ON TABLE public.room_availability IS 'Daily availability tracking per room type with overbooking support';
COMMENT ON TABLE public.daily_occupancy_metrics IS 'Daily occupancy metrics including arrivals, inhouse, and checkouts';
COMMENT ON TABLE public.daily_channel_summary IS 'Channel-specific booking summary for analytics';
COMMENT ON TABLE public.availability_calendar IS 'Calendar with demand forecasting and seasonal data';
COMMENT ON TABLE public.active_stays IS 'Current in-house guest tracking for occupancy calculations';
COMMENT ON COLUMN public.booking_rooms.booking_channel IS 'Booking channel: direct, ota, corporate';
COMMENT ON COLUMN public.booking_rooms.is_overbooked IS 'Flag indicating if this booking is overbooked';
COMMENT ON COLUMN public.booking_rooms.auto_assigned IS 'Flag indicating if room was auto-assigned by system';
COMMENT ON COLUMN public.rooms.maintenance_status IS 'Maintenance status: available, maintenance, blocked';
COMMENT ON COLUMN public.rooms.last_maintenance_date IS 'Date of last maintenance performed';
