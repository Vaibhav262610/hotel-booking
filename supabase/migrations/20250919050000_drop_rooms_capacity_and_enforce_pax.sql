-- Drop rooms.capacity, rely on room_types.beds and room_types.max_pax

-- Drop/replace dependent view, then remove column

DROP VIEW IF EXISTS public.available_rooms_for_assignment;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rooms' AND column_name='capacity'
  ) THEN
    ALTER TABLE public.rooms DROP COLUMN capacity;
  END IF;
END $$;

-- Recreate view without capacity
CREATE OR REPLACE VIEW public.available_rooms_for_assignment AS
SELECT 
    r.id as room_id,
    r.number as room_number,
    rt.name as room_type,
    rt.id as room_type_id,
    r.status,
    r.maintenance_status,
    COUNT(br.id) as current_bookings,
    CASE 
        WHEN r.status = 'available' 
        AND r.maintenance_status = 'available' 
        THEN 'AVAILABLE'
        WHEN r.maintenance_status = 'maintenance' 
        THEN 'MAINTENANCE'
        WHEN r.status = 'occupied' 
        THEN 'OCCUPIED'
        WHEN r.status = 'reserved' 
        THEN 'RESERVED'
        ELSE 'UNAVAILABLE'
    END as availability_status
FROM public.rooms r
JOIN public.room_types rt ON r.room_type_id = rt.id
LEFT JOIN public.booking_rooms br ON (
    br.room_id = r.id 
    AND br.room_status IN ('reserved', 'checked_in')
    AND br.check_out_date > CURRENT_DATE
)
GROUP BY r.id, r.number, rt.name, rt.id, r.status, r.maintenance_status
ORDER BY rt.name, r.number;

-- Helpful comments for developers
COMMENT ON COLUMN public.room_types.beds IS 'Number of beds in room type (used as base pax guideline)';
COMMENT ON COLUMN public.room_types.max_pax IS 'Maximum allowed guests for this room type (hard cap)';


