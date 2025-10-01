-- Allow 'maintenance' as a valid status for rooms
-- Safe migration: drops the existing check constraint if present and recreates it including 'maintenance'

BEGIN;

-- Drop old constraint if it exists
ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_status_check;

-- Recreate constraint with the full set of statuses actually used in the app
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_status_check
  CHECK (status IN (
    'available',
    'occupied',
    'reserved',
    'blocked',
    'cleaning',
    'unclean',
    'maintenance'
  ));

COMMIT;


