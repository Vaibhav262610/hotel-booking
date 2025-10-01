-- Availability RPC and supporting indexes

-- Helpful composite index for overlap query
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_dates_status
  ON public.booking_rooms (room_id, check_in_date, check_out_date, room_status);

CREATE INDEX IF NOT EXISTS idx_rooms_type_maint
  ON public.rooms (room_type_id, maintenance_status);

-- Function: get available rooms by type between two dates (half-open [from, to))
CREATE OR REPLACE FUNCTION public.get_available_rooms_by_type(
  p_room_type_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE (room_id uuid, room_number text) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.number
  FROM public.rooms r
  WHERE r.room_type_id = p_room_type_id
    AND r.maintenance_status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_rooms br
      WHERE br.room_id = r.id
        AND br.room_status IN ('reserved', 'checked_in')
        AND br.check_in_date < p_to
        AND br.check_out_date > p_from
    )
  ORDER BY r.number;
END;
$$;

COMMENT ON FUNCTION public.get_available_rooms_by_type(uuid, date, date)
  IS 'Returns rooms (id, number) of a type that are free for [from,to) window, excluding reserved/checked_in overlaps and maintenance.';


