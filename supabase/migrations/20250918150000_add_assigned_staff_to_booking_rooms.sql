-- Add assigned_staff_id column to booking_rooms table
-- This tracks which staff member is currently assigned to each room
-- Defaults to the booking staff_id, updates automatically on room transfers

-- Add the assigned_staff_id column
ALTER TABLE public.booking_rooms 
ADD COLUMN assigned_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_booking_rooms_assigned_staff_id ON public.booking_rooms (assigned_staff_id);

-- Backfill existing booking_rooms with the booking staff_id
UPDATE public.booking_rooms 
SET assigned_staff_id = b.staff_id
FROM public.bookings b
WHERE booking_rooms.booking_id = b.id 
AND booking_rooms.assigned_staff_id IS NULL;

-- Create function to update assigned_staff_id when room transfer occurs
CREATE OR REPLACE FUNCTION public.update_booking_room_assigned_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- When a room transfer is inserted, update the assigned_staff_id for the target room
  IF TG_OP = 'INSERT' THEN
    UPDATE public.booking_rooms 
    SET assigned_staff_id = NEW.transfer_staff_id
    WHERE booking_id = NEW.booking_id 
    AND room_id = NEW.to_room_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update assigned_staff_id on room transfers
CREATE TRIGGER trg_update_booking_room_assigned_staff
  AFTER INSERT ON public.room_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_room_assigned_staff();

-- Create function to set default assigned_staff_id when new booking_rooms are created
CREATE OR REPLACE FUNCTION public.set_default_assigned_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- If assigned_staff_id is not set, default to the booking's staff_id
  IF NEW.assigned_staff_id IS NULL THEN
    SELECT staff_id INTO NEW.assigned_staff_id
    FROM public.bookings
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set default assigned_staff_id on new booking_rooms
CREATE TRIGGER trg_set_default_assigned_staff
  BEFORE INSERT ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_assigned_staff();

-- Add comment to document the column purpose
COMMENT ON COLUMN public.booking_rooms.assigned_staff_id IS 'Staff member currently assigned to this room. Defaults to booking staff_id, updates automatically on room transfers.';
