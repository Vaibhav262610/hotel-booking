-- Create a simple denormalized room_transfers table for reporting
-- Columns requested: booking number, check-in date, guest name, transfer from room,
-- transfer to room, transfer date, reason, checked-in staff, transfer staff

-- 1) Enable pgcrypto if not already (for gen_random_uuid)
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END $$;

-- 2) Create table (normalized, using FKs for consistency)
-- Store only the data that is new to a transfer; derive labels via joins
CREATE TABLE IF NOT EXISTS public.room_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  to_room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  transfer_date timestamptz NOT NULL,
  reason text NULL,
  -- checked-in staff should reference the staff assigned on booking check-in
  checked_in_staff_id uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  -- staff who executed the transfer
  transfer_staff_id uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_transfers_from_to_diff CHECK (from_room_id IS DISTINCT FROM to_room_id)
);

-- 3) Helpful indexes for reporting
CREATE INDEX IF NOT EXISTS idx_room_transfers_booking_id ON public.room_transfers (booking_id);
CREATE INDEX IF NOT EXISTS idx_room_transfers_transfer_date ON public.room_transfers (transfer_date);

-- 4) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_room_transfers_set_updated_at ON public.room_transfers;
CREATE TRIGGER trg_room_transfers_set_updated_at
BEFORE UPDATE ON public.room_transfers
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();


