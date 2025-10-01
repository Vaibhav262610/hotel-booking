-- Create availability views and cleanup unnecessary columns
-- Based on README specifications for comprehensive availability reporting

-- 1) Create availability grid view for multi-date reporting
CREATE OR REPLACE VIEW public.availability_grid_view AS
SELECT 
    ac.calendar_date,
    EXTRACT(DOW FROM ac.calendar_date) as day_of_week,
    rt.name as room_type,
    ra.total_rooms,
    ra.occupied_rooms,
    ra.blocked_rooms,
    ra.maintenance_rooms,
    ra.available_rooms,
    ra.overbooked_rooms,
    dcs.direct_bookings,
    dcs.ota_bookings,
    dcs.corporate_bookings,
    ROUND((ra.occupied_rooms::DECIMAL / NULLIF(ra.total_rooms, 0)) * 100, 2) as occupancy_percentage,
    CASE 
        WHEN ra.available_rooms < 0 THEN 'OVERBOOKED'
        WHEN ra.available_rooms = 0 THEN 'SOLD OUT'
        ELSE 'AVAILABLE'
    END as availability_status
FROM public.availability_calendar ac
CROSS JOIN public.room_types rt
LEFT JOIN public.room_availability ra ON (ac.calendar_date = ra.availability_date AND rt.id = ra.room_type_id)
LEFT JOIN public.daily_channel_summary dcs ON (ac.calendar_date = dcs.summary_date AND rt.id = dcs.room_type_id AND dcs.channel_type = 'direct')
WHERE rt.name IN ('DELUXE', 'DELUXE TRIPLE', 'DELUXE QUAD', 'KING SUITE', 'PRESIDENTIAL SUITE')
ORDER BY ac.calendar_date, rt.name;

-- 2) Create daily occupancy metrics view
CREATE OR REPLACE VIEW public.daily_occupancy_view AS
SELECT 
    dom.metric_date,
    rt.name as room_type,
    dom.total_inventory as "Total Rooms (A)",
    dom.arrivals_count as "Arrivals (B)",
    dom.inhouse_count as "Inhouse (C)",
    dom.checkout_count as "Checkouts (D)",
    dom.net_occupancy as "Occupancy (B+C-D)",
    dom.blocked_count as "Blocked (F)",
    dom.maintenance_count as "Maintenance (G)",
    dom.available_count as "Available A-(E+F+G)"
FROM public.daily_occupancy_metrics dom
JOIN public.room_types rt ON dom.room_type_id = rt.id
ORDER BY dom.metric_date, rt.name;

-- 3) Create overbooking analysis view
CREATE OR REPLACE VIEW public.overbooking_analysis_view AS
SELECT 
    ra.availability_date,
    rt.name as room_type,
    ra.total_rooms,
    ra.occupied_rooms,
    ra.available_rooms,
    CASE 
        WHEN ra.available_rooms < 0 THEN ABS(ra.available_rooms)
        ELSE 0
    END as overbooking_count,
    CASE 
        WHEN ra.available_rooms < 0 THEN 'OVERBOOKED'
        WHEN ra.available_rooms = 0 THEN 'SOLD OUT'
        ELSE 'AVAILABLE'
    END as status,
    ROUND((ra.occupied_rooms::DECIMAL / NULLIF(ra.total_rooms, 0)) * 100, 2) as occupancy_percentage
FROM public.room_availability ra
JOIN public.room_types rt ON ra.room_type_id = rt.id
WHERE ra.available_rooms <= 0
ORDER BY ra.availability_date, rt.name;

-- 4) Create room availability summary view
CREATE OR REPLACE VIEW public.room_availability_summary AS
SELECT 
    rt.name as room_type,
    COUNT(r.id) as total_rooms,
    COUNT(CASE WHEN r.status = 'available' AND r.maintenance_status = 'available' THEN 1 END) as available_rooms,
    COUNT(CASE WHEN r.maintenance_status = 'maintenance' THEN 1 END) as maintenance_rooms,
    COUNT(CASE WHEN r.status = 'occupied' THEN 1 END) as occupied_rooms,
    COUNT(CASE WHEN r.status = 'reserved' THEN 1 END) as reserved_rooms,
    ROUND((COUNT(CASE WHEN r.status IN ('occupied', 'reserved') THEN 1 END)::DECIMAL / NULLIF(COUNT(r.id), 0)) * 100, 2) as utilization_percentage
FROM public.room_types rt
LEFT JOIN public.rooms r ON rt.id = r.room_type_id
GROUP BY rt.id, rt.name
ORDER BY rt.name;

-- 5) Create channel performance view
CREATE OR REPLACE VIEW public.channel_performance_view AS
SELECT 
    dcs.channel_type,
    dcs.summary_date,
    rt.name as room_type,
    dcs.total_bookings,
    dcs.direct_bookings,
    dcs.ota_bookings,
    dcs.corporate_bookings,
    ROUND((dcs.total_bookings::DECIMAL / NULLIF(ra.total_rooms, 0)) * 100, 2) as channel_occupancy_percentage
FROM public.daily_channel_summary dcs
JOIN public.room_types rt ON dcs.room_type_id = rt.id
LEFT JOIN public.room_availability ra ON (dcs.summary_date = ra.availability_date AND dcs.room_type_id = ra.room_type_id)
ORDER BY dcs.summary_date, dcs.channel_type, rt.name;

-- 6) Create active stays view
CREATE OR REPLACE VIEW public.active_stays_view AS
SELECT 
    as_table.stay_date,
    rt.name as room_type,
    r.number as room_number,
    g.name as guest_name,
    b.booking_number,
    as_table.status,
    br.check_in_date,
    br.check_out_date,
    br.actual_check_in,
    br.actual_check_out
FROM public.active_stays as_table
JOIN public.rooms r ON as_table.room_id = r.id
JOIN public.room_types rt ON as_table.room_type_id = rt.id
JOIN public.guests g ON as_table.guest_id = g.id
JOIN public.bookings b ON as_table.booking_id = b.id
JOIN public.booking_rooms br ON (as_table.booking_id = br.booking_id AND as_table.room_id = br.room_id)
WHERE as_table.status = 'in_house'
ORDER BY as_table.stay_date, rt.name, r.number;

-- 7) Create room assignment helper view
CREATE OR REPLACE VIEW public.available_rooms_for_assignment AS
SELECT 
    r.id as room_id,
    r.number as room_number,
    rt.name as room_type,
    rt.id as room_type_id,
    r.capacity,
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
GROUP BY r.id, r.number, rt.name, rt.id, r.capacity, r.status, r.maintenance_status
ORDER BY rt.name, r.capacity, r.number;

-- 8) Remove unnecessary columns from existing tables (as requested)

-- Remove room_id from bookings table if it still exists (should have been removed in previous migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN room_id;
  END IF;
END $$;

-- Remove dependent triggers first
DROP TRIGGER IF EXISTS trg_compute_booking_nights ON public.bookings;

-- Remove check_in and check_out from bookings table if they still exist (now handled by booking_rooms)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_in'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN check_in;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_out'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN check_out;
  END IF;
END $$;

-- Remove expected_checkout from bookings table if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'expected_checkout'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN expected_checkout;
  END IF;
END $$;

-- 9) Create function to populate availability calendar
CREATE OR REPLACE FUNCTION public.populate_availability_calendar(
    start_date date,
    end_date date
) RETURNS void AS $$
DECLARE
    current_date_val date;
BEGIN
    FOR current_date_val IN 
        SELECT generate_series(start_date, end_date, INTERVAL '1 day')::date
    LOOP
        INSERT INTO public.availability_calendar (
            calendar_date,
            day_of_week,
            is_weekend,
            is_holiday,
            season_type,
            demand_forecast
        )
        VALUES (
            current_date_val,
            TO_CHAR(current_date_val, 'Day'),
            EXTRACT(DOW FROM current_date_val) IN (0, 6), -- Sunday = 0, Saturday = 6
            false, -- Can be enhanced with holiday table
            CASE 
                WHEN EXTRACT(MONTH FROM current_date_val) IN (12, 1, 2) THEN 'Winter'
                WHEN EXTRACT(MONTH FROM current_date_val) IN (3, 4, 5) THEN 'Spring'
                WHEN EXTRACT(MONTH FROM current_date_val) IN (6, 7, 8) THEN 'Summer'
                ELSE 'Fall'
            END,
            1.0 -- Default demand forecast, can be enhanced with ML models
        )
        ON CONFLICT (calendar_date) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10) Populate availability calendar for next 365 days
SELECT public.populate_availability_calendar(CURRENT_DATE, (CURRENT_DATE + INTERVAL '365 days')::date);

-- 11) Create function to get room availability for date range
CREATE OR REPLACE FUNCTION public.get_room_availability(
    p_room_type_id uuid,
    p_start_date date,
    p_end_date date
) RETURNS TABLE (
    availability_date date,
    total_rooms integer,
    occupied_rooms integer,
    available_rooms integer,
    overbooked_rooms integer,
    availability_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ra.availability_date,
        ra.total_rooms,
        ra.occupied_rooms,
        ra.available_rooms,
        ra.overbooked_rooms,
        CASE 
            WHEN ra.available_rooms < 0 THEN 'OVERBOOKED'
            WHEN ra.available_rooms = 0 THEN 'SOLD OUT'
            ELSE 'AVAILABLE'
        END as availability_status
    FROM public.room_availability ra
    WHERE ra.room_type_id = p_room_type_id
    AND ra.availability_date BETWEEN p_start_date AND p_end_date
    ORDER BY ra.availability_date;
END;
$$ LANGUAGE plpgsql;

-- 12) Create function to check room availability for booking
CREATE OR REPLACE FUNCTION public.check_room_availability_for_booking(
    p_room_type_id uuid,
    p_check_in_date date,
    p_check_out_date date,
    p_guest_count integer
) RETURNS TABLE (
    is_available boolean,
    available_rooms integer,
    overbooked_rooms integer,
    suggested_upgrade_room_type_id uuid,
    suggested_upgrade_room_type_name varchar(100)
) AS $$
DECLARE
    min_available_rooms integer;
    upgrade_room_type_id uuid;
    upgrade_room_type_name varchar(100);
BEGIN
    -- Get minimum available rooms for the date range
    SELECT MIN(ra.available_rooms) INTO min_available_rooms
    FROM public.room_availability ra
    WHERE ra.room_type_id = p_room_type_id
    AND ra.availability_date BETWEEN p_check_in_date AND p_check_out_date - INTERVAL '1 day';
    
    -- Get upgrade room type if overbooked
    IF min_available_rooms < 0 THEN
        SELECT public.get_upgrade_room_type(p_room_type_id) INTO upgrade_room_type_id;
        
        IF upgrade_room_type_id IS NOT NULL THEN
            SELECT name INTO upgrade_room_type_name
            FROM public.room_types
            WHERE id = upgrade_room_type_id;
        END IF;
    END IF;
    
    RETURN QUERY
    SELECT 
        (min_available_rooms >= 0) as is_available,
        GREATEST(min_available_rooms, 0) as available_rooms,
        ABS(LEAST(min_available_rooms, 0)) as overbooked_rooms,
        upgrade_room_type_id,
        upgrade_room_type_name;
END;
$$ LANGUAGE plpgsql;

-- 13) Add comments for documentation
COMMENT ON VIEW public.availability_grid_view IS 'Multi-date availability grid for reporting and analytics';
COMMENT ON VIEW public.daily_occupancy_view IS 'Daily occupancy metrics for operational reporting';
COMMENT ON VIEW public.overbooking_analysis_view IS 'Overbooking analysis for revenue management';
COMMENT ON VIEW public.room_availability_summary IS 'Current room availability summary by room type';
COMMENT ON VIEW public.channel_performance_view IS 'Channel performance analysis for booking sources';
COMMENT ON VIEW public.active_stays_view IS 'Current active stays for operational management';
COMMENT ON VIEW public.available_rooms_for_assignment IS 'Available rooms for auto-assignment system';
COMMENT ON FUNCTION public.populate_availability_calendar(date, date) IS 'Populate availability calendar for date range';
COMMENT ON FUNCTION public.get_room_availability(uuid, date, date) IS 'Get room availability for specific date range';
COMMENT ON FUNCTION public.check_room_availability_for_booking(uuid, date, date, integer) IS 'Check room availability for booking with upgrade suggestions';
