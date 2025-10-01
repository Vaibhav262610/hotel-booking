-- Add blocked rooms tracking infrastructure
-- Create blocked_rooms table for tracking room blocking and unblocking operations

-- 1) Add 'blocked' status to rooms table status constraint
ALTER TABLE public.rooms 
DROP CONSTRAINT IF EXISTS rooms_status_check;

ALTER TABLE public.rooms 
ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('available', 'occupied', 'reserved', 'blocked'));

-- 2) Create blocked_rooms table for detailed blocking records
CREATE TABLE IF NOT EXISTS public.blocked_rooms (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  blocked_by_staff_id uuid NOT NULL REFERENCES public.staff(id),
  blocked_date timestamptz NOT NULL DEFAULT now(),
  blocked_from_date date NOT NULL,
  blocked_to_date date NOT NULL,
  reason text NOT NULL,
  unblocked_date timestamptz,
  unblocked_by_staff_id uuid REFERENCES public.staff(id),
  unblock_reason text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure blocked_to > blocked_from
  CHECK (blocked_to_date > blocked_from_date),
  
  -- Ensure unblocked_date is after blocked_date if unblocked
  CHECK (unblocked_date IS NULL OR unblocked_date > blocked_date)
);

-- 3) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_rooms_room_id ON public.blocked_rooms (room_id);
CREATE INDEX IF NOT EXISTS idx_blocked_rooms_blocked_by ON public.blocked_rooms (blocked_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_blocked_rooms_dates ON public.blocked_rooms (blocked_from_date, blocked_to_date);
CREATE INDEX IF NOT EXISTS idx_blocked_rooms_active ON public.blocked_rooms (is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_rooms_blocked_date ON public.blocked_rooms (blocked_date);

-- 4) Create function to block a room
CREATE OR REPLACE FUNCTION public.block_room(
  p_room_id uuid,
  p_blocked_by_staff_id uuid,
  p_blocked_from_date date,
  p_blocked_to_date date,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_blocked_room_id uuid;
  v_room_exists boolean;
  v_conflicting_block boolean;
BEGIN
  -- Check if room exists
  SELECT EXISTS(
    SELECT 1 FROM public.rooms 
    WHERE id = p_room_id
  ) INTO v_room_exists;
  
  IF NOT v_room_exists THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  -- Check for conflicting active blocks
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_rooms 
    WHERE room_id = p_room_id 
    AND is_active = true
    AND (
      (blocked_from_date <= p_blocked_from_date AND blocked_to_date > p_blocked_from_date) OR
      (blocked_from_date < p_blocked_to_date AND blocked_to_date >= p_blocked_to_date) OR
      (blocked_from_date >= p_blocked_from_date AND blocked_to_date <= p_blocked_to_date)
    )
  ) INTO v_conflicting_block;
  
  IF v_conflicting_block THEN
    RAISE EXCEPTION 'Room is already blocked for the specified date range';
  END IF;
  
  -- Create blocking record
  INSERT INTO public.blocked_rooms (
    room_id,
    blocked_by_staff_id,
    blocked_from_date,
    blocked_to_date,
    reason,
    notes
  ) VALUES (
    p_room_id,
    p_blocked_by_staff_id,
    p_blocked_from_date,
    p_blocked_to_date,
    p_reason,
    p_notes
  ) RETURNING id INTO v_blocked_room_id;
  
  -- Update room status to blocked
  UPDATE public.rooms 
  SET 
    status = 'blocked',
    updated_at = now()
  WHERE id = p_room_id;
  
  RETURN v_blocked_room_id;
END;
$$;

-- 5) Create function to unblock a room
CREATE OR REPLACE FUNCTION public.unblock_room(
  p_blocked_room_id uuid,
  p_unblocked_by_staff_id uuid,
  p_unblock_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_room_id uuid;
  v_blocked_room_exists boolean;
BEGIN
  -- Get room_id and check if blocked room exists
  SELECT room_id, EXISTS(
    SELECT 1 FROM public.blocked_rooms 
    WHERE id = p_blocked_room_id AND is_active = true
  ) INTO v_room_id, v_blocked_room_exists;
  
  IF NOT v_blocked_room_exists THEN
    RAISE EXCEPTION 'Blocked room record not found or already unblocked';
  END IF;
  
  -- Update blocked room record
  UPDATE public.blocked_rooms 
  SET 
    is_active = false,
    unblocked_date = now(),
    unblocked_by_staff_id = p_unblocked_by_staff_id,
    unblock_reason = p_unblock_reason,
    updated_at = now()
  WHERE id = p_blocked_room_id;
  
  -- Check if room has any other active blocks
  IF NOT EXISTS(
    SELECT 1 FROM public.blocked_rooms 
    WHERE room_id = v_room_id 
    AND is_active = true
    AND blocked_to_date >= CURRENT_DATE
  ) THEN
    -- No active blocks, update room status based on bookings
    UPDATE public.rooms 
    SET status = CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.booking_rooms br 
        WHERE br.room_id = v_room_id 
        AND br.room_status = 'checked_in'
        AND br.check_out_date >= CURRENT_DATE
      ) THEN 'occupied'
      WHEN EXISTS (
        SELECT 1 FROM public.booking_rooms br 
        WHERE br.room_id = v_room_id 
        AND br.room_status = 'reserved'
        AND br.check_in_date <= CURRENT_DATE
        AND br.check_out_date >= CURRENT_DATE
      ) THEN 'reserved'
      ELSE 'available'
    END
    WHERE id = v_room_id;
  END IF;
END;
$$;

-- 6) Create function to get blocked room statistics
CREATE OR REPLACE FUNCTION public.get_blocked_room_stats(
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL
)
RETURNS TABLE (
  total_blocked bigint,
  currently_blocked bigint,
  blocked_by_staff jsonb,
  blocked_by_reason jsonb,
  avg_block_duration numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_blocked,
    COUNT(*) FILTER (WHERE is_active = true) as currently_blocked,
    COALESCE(
      jsonb_object_agg(
        COALESCE(s.name, 'Unknown Staff'), 
        staff_count
      ) FILTER (WHERE s.name IS NOT NULL),
      '{}'::jsonb
    ) as blocked_by_staff,
    COALESCE(
      jsonb_object_agg(
        COALESCE(br.reason, 'No reason provided'), 
        reason_count
      ) FILTER (WHERE br.reason IS NOT NULL),
      '{}'::jsonb
    ) as blocked_by_reason,
    COALESCE(AVG(EXTRACT(EPOCH FROM (blocked_to_date - blocked_from_date)) / 86400), 0) as avg_block_duration
  FROM (
    SELECT 
      br.blocked_by_staff_id,
      br.reason,
      br.blocked_from_date,
      br.blocked_to_date,
      br.is_active,
      COUNT(*) as staff_count,
      COUNT(*) as reason_count
    FROM public.blocked_rooms br
    LEFT JOIN public.staff s ON br.blocked_by_staff_id = s.id
    WHERE 
      (p_from_date IS NULL OR br.blocked_date::date >= p_from_date)
      AND (p_to_date IS NULL OR br.blocked_date::date <= p_to_date)
    GROUP BY br.blocked_by_staff_id, br.reason, br.blocked_from_date, br.blocked_to_date, br.is_active
  ) br
  LEFT JOIN public.staff s ON br.blocked_by_staff_id = s.id;
END;
$$;

-- 7) Add update trigger for blocked_rooms
CREATE OR REPLACE FUNCTION public.update_blocked_rooms_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_blocked_rooms_updated_at
  BEFORE UPDATE ON public.blocked_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blocked_rooms_updated_at();

-- 8) Add comments for documentation
COMMENT ON TABLE public.blocked_rooms IS 'Detailed records of room blocking and unblocking operations';
COMMENT ON COLUMN public.blocked_rooms.blocked_by_staff_id IS 'Staff member who blocked the room';
COMMENT ON COLUMN public.blocked_rooms.blocked_date IS 'Date and time when room was blocked';
COMMENT ON COLUMN public.blocked_rooms.blocked_from_date IS 'Start date of the blocking period';
COMMENT ON COLUMN public.blocked_rooms.blocked_to_date IS 'End date of the blocking period';
COMMENT ON COLUMN public.blocked_rooms.reason IS 'Reason for blocking the room';
COMMENT ON COLUMN public.blocked_rooms.unblocked_date IS 'Date and time when room was unblocked';
COMMENT ON COLUMN public.blocked_rooms.unblocked_by_staff_id IS 'Staff member who unblocked the room';
COMMENT ON COLUMN public.blocked_rooms.unblock_reason IS 'Reason for unblocking the room';
COMMENT ON COLUMN public.blocked_rooms.is_active IS 'Whether the blocking is currently active';

COMMENT ON FUNCTION public.block_room IS 'Blocks a room for a specified date range';
COMMENT ON FUNCTION public.unblock_room IS 'Unblocks a previously blocked room';
COMMENT ON FUNCTION public.get_blocked_room_stats IS 'Returns blocked room statistics for a date range';
