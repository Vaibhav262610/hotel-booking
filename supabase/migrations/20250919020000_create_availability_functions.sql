-- Create comprehensive availability management functions and triggers
-- Real-time availability updates, auto-room assignment, and overbooking management

-- 1) Function to update room availability in real-time
CREATE OR REPLACE FUNCTION public.update_room_availability_realtime()
RETURNS TRIGGER AS $$
DECLARE
    room_type_id_val uuid;
    total_rooms_count integer;
    current_date_val date;
BEGIN
    -- Get room type ID
    SELECT r.room_type_id INTO room_type_id_val
    FROM public.rooms r
    WHERE r.id = COALESCE(NEW.room_id, OLD.room_id);
    
    -- Get total rooms for this room type
    SELECT COUNT(*) INTO total_rooms_count
    FROM public.rooms
    WHERE room_type_id = room_type_id_val;
    
    -- Handle INSERT (new booking)
    IF TG_OP = 'INSERT' THEN
        -- Update availability for each day in the booking period
        FOR current_date_val IN 
            SELECT generate_series(NEW.check_in_date, NEW.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            INSERT INTO public.room_availability (
                room_type_id, 
                availability_date, 
                total_rooms, 
                occupied_rooms
            )
            VALUES (
                room_type_id_val,
                current_date_val,
                total_rooms_count,
                1
            )
            ON CONFLICT (room_type_id, availability_date)
            DO UPDATE SET 
                occupied_rooms = room_availability.occupied_rooms + 1,
                total_rooms = total_rooms_count,
                updated_at = now();
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (booking modification)
    IF TG_OP = 'UPDATE' THEN
        -- Remove old availability
        FOR current_date_val IN 
            SELECT generate_series(OLD.check_in_date, OLD.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            UPDATE public.room_availability
            SET occupied_rooms = GREATEST(occupied_rooms - 1, 0),
                updated_at = now()
            WHERE room_type_id = room_type_id_val
            AND availability_date = current_date_val;
        END LOOP;
        
        -- Add new availability
        FOR current_date_val IN 
            SELECT generate_series(NEW.check_in_date, NEW.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            INSERT INTO public.room_availability (
                room_type_id, 
                availability_date, 
                total_rooms, 
                occupied_rooms
            )
            VALUES (
                room_type_id_val,
                current_date_val,
                total_rooms_count,
                1
            )
            ON CONFLICT (room_type_id, availability_date)
            DO UPDATE SET 
                occupied_rooms = room_availability.occupied_rooms + 1,
                total_rooms = total_rooms_count,
                updated_at = now();
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (booking cancellation)
    IF TG_OP = 'DELETE' THEN
        FOR current_date_val IN 
            SELECT generate_series(OLD.check_in_date, OLD.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            UPDATE public.room_availability
            SET occupied_rooms = GREATEST(occupied_rooms - 1, 0),
                updated_at = now()
            WHERE room_type_id = room_type_id_val
            AND availability_date = current_date_val;
        END LOOP;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2) Function to assign best available room with exact capacity matching
CREATE OR REPLACE FUNCTION public.assign_best_available_room(
    p_room_type_id uuid,
    p_check_in_date date,
    p_check_out_date date,
    p_guest_count integer
) RETURNS uuid AS $$
DECLARE
    selected_room_id uuid;
BEGIN
    -- Find best available room based on exact capacity match
    SELECT r.id INTO selected_room_id
    FROM public.rooms r
    WHERE r.room_type_id = p_room_type_id
    AND r.status = 'available'
    AND r.capacity = p_guest_count  -- Exact capacity match
    AND r.maintenance_status = 'available'
    AND NOT EXISTS (
        SELECT 1 FROM public.booking_rooms br
        WHERE br.room_id = r.id
        AND br.room_status IN ('reserved', 'checked_in')
        AND br.check_in_date < p_check_out_date
        AND br.check_out_date > p_check_in_date
    )
    ORDER BY r.number ASC  -- Consistent ordering by room number
    LIMIT 1;
    
    RETURN selected_room_id;
END;
$$ LANGUAGE plpgsql;

-- 3) Function to check overbooking availability
CREATE OR REPLACE FUNCTION public.check_overbooking_availability(
    p_room_type_id uuid,
    p_check_in_date date,
    p_check_out_date date
) RETURNS boolean AS $$
DECLARE
    total_rooms integer;
    occupied_rooms integer;
    available_rooms integer;
    overbooking_limit integer;
BEGIN
    -- Get total rooms for this type
    SELECT COUNT(*) INTO total_rooms
    FROM public.rooms 
    WHERE room_type_id = p_room_type_id 
    AND status = 'available'
    AND maintenance_status = 'available';
    
    -- Get occupied rooms for date range
    SELECT COUNT(*) INTO occupied_rooms
    FROM public.booking_rooms br
    JOIN public.rooms r ON br.room_id = r.id
    WHERE r.room_type_id = p_room_type_id
    AND br.room_status IN ('reserved', 'checked_in')
    AND br.check_in_date < p_check_out_date
    AND br.check_out_date > p_check_in_date;
    
    available_rooms := total_rooms - occupied_rooms;
    
    -- Check if overbooking is allowed (10% overbooking limit as per README)
    overbooking_limit := total_rooms * 0.1;
    
    RETURN available_rooms >= -overbooking_limit;
END;
$$ LANGUAGE plpgsql;

-- 4) Function to get upgrade room type for overbooking
CREATE OR REPLACE FUNCTION public.get_upgrade_room_type(
    p_current_room_type_id uuid
) RETURNS uuid AS $$
DECLARE
    upgrade_room_type_id uuid;
    current_room_type_name varchar(100);
BEGIN
    -- Get current room type name
    SELECT name INTO current_room_type_name
    FROM public.room_types
    WHERE id = p_current_room_type_id;
    
    -- Define upgrade hierarchy: DELUXE → DELUXE TRIPLE → KING SUITE → PRESIDENTIAL
    CASE current_room_type_name
        WHEN 'DELUXE' THEN
            SELECT id INTO upgrade_room_type_id
            FROM public.room_types
            WHERE name = 'DELUXE TRIPLE'
            LIMIT 1;
        WHEN 'DELUXE TRIPLE' THEN
            SELECT id INTO upgrade_room_type_id
            FROM public.room_types
            WHERE name = 'KING SUITE'
            LIMIT 1;
        WHEN 'KING SUITE' THEN
            SELECT id INTO upgrade_room_type_id
            FROM public.room_types
            WHERE name = 'PRESIDENTIAL SUITE'
            LIMIT 1;
        ELSE
            upgrade_room_type_id := NULL; -- No upgrade available
    END CASE;
    
    RETURN upgrade_room_type_id;
END;
$$ LANGUAGE plpgsql;

-- 5) Function to update daily occupancy metrics
CREATE OR REPLACE FUNCTION public.update_daily_occupancy_metrics()
RETURNS TRIGGER AS $$
DECLARE
    room_type_id_val uuid;
    total_inventory_count integer;
    arrivals_count_val integer;
    inhouse_count_val integer;
    checkout_count_val integer;
    blocked_count_val integer;
    maintenance_count_val integer;
    current_date_val date;
BEGIN
    -- Get room type ID
    SELECT r.room_type_id INTO room_type_id_val
    FROM public.rooms r
    WHERE r.id = COALESCE(NEW.room_id, OLD.room_id);
    
    -- Get total inventory
    SELECT COUNT(*) INTO total_inventory_count
    FROM public.rooms
    WHERE room_type_id = room_type_id_val;
    
    -- Update metrics for each day in the booking period
    FOR current_date_val IN 
        SELECT generate_series(
            COALESCE(NEW.check_in_date, OLD.check_in_date), 
            COALESCE(NEW.check_out_date, OLD.check_out_date) - INTERVAL '1 day', 
            INTERVAL '1 day'
        )::date
    LOOP
        -- Calculate arrivals for this date
        SELECT COUNT(*) INTO arrivals_count_val
        FROM public.booking_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        WHERE r.room_type_id = room_type_id_val
        AND br.check_in_date = current_date_val
        AND br.room_status IN ('reserved', 'checked_in');
        
        -- Calculate inhouse for this date
        SELECT COUNT(*) INTO inhouse_count_val
        FROM public.booking_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        WHERE r.room_type_id = room_type_id_val
        AND br.check_in_date <= current_date_val
        AND br.check_out_date > current_date_val
        AND br.room_status IN ('checked_in');
        
        -- Calculate checkouts for this date
        SELECT COUNT(*) INTO checkout_count_val
        FROM public.booking_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        WHERE r.room_type_id = room_type_id_val
        AND br.check_out_date = current_date_val
        AND br.room_status IN ('checked_out');
        
        -- Calculate blocked rooms for this date
        SELECT COUNT(*) INTO blocked_count_val
        FROM public.blocked_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        WHERE r.room_type_id = room_type_id_val
        AND br.blocked_from_date <= current_date_val
        AND br.blocked_to_date >= current_date_val
        AND br.unblocked_date IS NULL;
        
        -- Calculate maintenance rooms for this date
        SELECT COUNT(*) INTO maintenance_count_val
        FROM public.rooms r
        WHERE r.room_type_id = room_type_id_val
        AND r.maintenance_status = 'maintenance';
        
        -- Insert or update daily metrics
        INSERT INTO public.daily_occupancy_metrics (
            room_type_id,
            metric_date,
            total_inventory,
            arrivals_count,
            inhouse_count,
            checkout_count,
            blocked_count,
            maintenance_count
        )
        VALUES (
            room_type_id_val,
            current_date_val,
            total_inventory_count,
            arrivals_count_val,
            inhouse_count_val,
            checkout_count_val,
            blocked_count_val,
            maintenance_count_val
        )
        ON CONFLICT (room_type_id, metric_date)
        DO UPDATE SET
            total_inventory = total_inventory_count,
            arrivals_count = arrivals_count_val,
            inhouse_count = inhouse_count_val,
            checkout_count = checkout_count_val,
            blocked_count = blocked_count_val,
            maintenance_count = maintenance_count_val,
            updated_at = now();
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 6) Function to update channel summary
CREATE OR REPLACE FUNCTION public.update_channel_summary()
RETURNS TRIGGER AS $$
DECLARE
    room_type_id_val uuid;
    channel_type_val varchar(50);
    current_date_val date;
    booking_count integer;
BEGIN
    -- Get room type ID
    SELECT r.room_type_id INTO room_type_id_val
    FROM public.rooms r
    WHERE r.id = COALESCE(NEW.room_id, OLD.room_id);
    
    -- Get channel type
    channel_type_val := COALESCE(NEW.booking_channel, OLD.booking_channel, 'direct');
    
    -- Update channel summary for each day in the booking period
    FOR current_date_val IN 
        SELECT generate_series(
            COALESCE(NEW.check_in_date, OLD.check_in_date), 
            COALESCE(NEW.check_out_date, OLD.check_out_date) - INTERVAL '1 day', 
            INTERVAL '1 day'
        )::date
    LOOP
        -- Count bookings for this channel and date
        SELECT COUNT(*) INTO booking_count
        FROM public.booking_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        WHERE r.room_type_id = room_type_id_val
        AND br.booking_channel = channel_type_val
        AND br.check_in_date = current_date_val;
        
        -- Insert or update channel summary
        INSERT INTO public.daily_channel_summary (
            channel_type,
            summary_date,
            room_type_id,
            total_bookings,
            direct_bookings,
            ota_bookings,
            corporate_bookings
        )
        VALUES (
            channel_type_val,
            current_date_val,
            room_type_id_val,
            booking_count,
            CASE WHEN channel_type_val = 'direct' THEN booking_count ELSE 0 END,
            CASE WHEN channel_type_val = 'ota' THEN booking_count ELSE 0 END,
            CASE WHEN channel_type_val = 'corporate' THEN booking_count ELSE 0 END
        )
        ON CONFLICT (channel_type, summary_date, room_type_id)
        DO UPDATE SET
            total_bookings = booking_count,
            direct_bookings = CASE WHEN channel_type_val = 'direct' THEN booking_count ELSE daily_channel_summary.direct_bookings END,
            ota_bookings = CASE WHEN channel_type_val = 'ota' THEN booking_count ELSE daily_channel_summary.ota_bookings END,
            corporate_bookings = CASE WHEN channel_type_val = 'corporate' THEN booking_count ELSE daily_channel_summary.corporate_bookings END,
            updated_at = now();
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7) Function to update active stays
CREATE OR REPLACE FUNCTION public.update_active_stays()
RETURNS TRIGGER AS $$
DECLARE
    room_type_id_val uuid;
    guest_id_val uuid;
    current_date_val date;
BEGIN
    -- Get room type ID and guest ID
    SELECT r.room_type_id, b.guest_id INTO room_type_id_val, guest_id_val
    FROM public.rooms r
    JOIN public.bookings b ON b.id = COALESCE(NEW.booking_id, OLD.booking_id)
    WHERE r.id = COALESCE(NEW.room_id, OLD.room_id);
    
    -- Handle INSERT (new booking)
    IF TG_OP = 'INSERT' THEN
        -- Add active stays for each day in the booking period
        FOR current_date_val IN 
            SELECT generate_series(NEW.check_in_date, NEW.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            INSERT INTO public.active_stays (
                booking_id,
                room_id,
                room_type_id,
                guest_id,
                stay_date,
                status
            )
            VALUES (
                NEW.booking_id,
                NEW.room_id,
                room_type_id_val,
                guest_id_val,
                current_date_val,
                'in_house'
            )
            ON CONFLICT (booking_id, stay_date)
            DO UPDATE SET
                status = 'in_house',
                updated_at = now();
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (booking modification)
    IF TG_OP = 'UPDATE' THEN
        -- Remove old active stays
        DELETE FROM public.active_stays
        WHERE booking_id = OLD.booking_id
        AND stay_date BETWEEN OLD.check_in_date AND OLD.check_out_date - INTERVAL '1 day';
        
        -- Add new active stays
        FOR current_date_val IN 
            SELECT generate_series(NEW.check_in_date, NEW.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            INSERT INTO public.active_stays (
                booking_id,
                room_id,
                room_type_id,
                guest_id,
                stay_date,
                status
            )
            VALUES (
                NEW.booking_id,
                NEW.room_id,
                room_type_id_val,
                guest_id_val,
                current_date_val,
                'in_house'
            )
            ON CONFLICT (booking_id, stay_date)
            DO UPDATE SET
                status = 'in_house',
                updated_at = now();
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (booking cancellation)
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.active_stays
        WHERE booking_id = OLD.booking_id
        AND stay_date BETWEEN OLD.check_in_date AND OLD.check_out_date - INTERVAL '1 day';
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8) Create triggers for real-time availability updates
DROP TRIGGER IF EXISTS trg_booking_rooms_availability_update ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_availability_update
    AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
    FOR EACH ROW EXECUTE FUNCTION public.update_room_availability_realtime();

DROP TRIGGER IF EXISTS trg_booking_rooms_occupancy_metrics ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_occupancy_metrics
    AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
    FOR EACH ROW EXECUTE FUNCTION public.update_daily_occupancy_metrics();

DROP TRIGGER IF EXISTS trg_booking_rooms_channel_summary ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_channel_summary
    AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
    FOR EACH ROW EXECUTE FUNCTION public.update_channel_summary();

DROP TRIGGER IF EXISTS trg_booking_rooms_active_stays ON public.booking_rooms;
CREATE TRIGGER trg_booking_rooms_active_stays
    AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
    FOR EACH ROW EXECUTE FUNCTION public.update_active_stays();

-- 9) Function to initialize availability data for existing bookings
CREATE OR REPLACE FUNCTION public.initialize_availability_data()
RETURNS void AS $$
DECLARE
    booking_record RECORD;
    current_date_val date;
    room_type_id_val uuid;
    total_rooms_count integer;
BEGIN
    -- Initialize room_availability for all existing bookings
    FOR booking_record IN 
        SELECT br.*, r.room_type_id
        FROM public.booking_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        WHERE br.room_status IN ('reserved', 'checked_in')
    LOOP
        room_type_id_val := booking_record.room_type_id;
        
        -- Get total rooms for this room type
        SELECT COUNT(*) INTO total_rooms_count
        FROM public.rooms
        WHERE room_type_id = room_type_id_val;
        
        -- Insert availability for each day in the booking period
        FOR current_date_val IN 
            SELECT generate_series(booking_record.check_in_date, booking_record.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            INSERT INTO public.room_availability (room_type_id, availability_date, total_rooms, occupied_rooms)
            VALUES (room_type_id_val, current_date_val, total_rooms_count, 1)
            ON CONFLICT (room_type_id, availability_date)
            DO UPDATE SET 
                occupied_rooms = room_availability.occupied_rooms + 1,
                total_rooms = total_rooms_count;
        END LOOP;
    END LOOP;
    
    -- Initialize daily_occupancy_metrics for all existing bookings
    FOR booking_record IN 
        SELECT br.*, r.room_type_id
        FROM public.booking_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        WHERE br.room_status IN ('reserved', 'checked_in')
    LOOP
        room_type_id_val := booking_record.room_type_id;
        
        -- Get total rooms for this room type
        SELECT COUNT(*) INTO total_rooms_count
        FROM public.rooms
        WHERE room_type_id = room_type_id_val;
        
        -- Insert metrics for each day in the booking period
        FOR current_date_val IN 
            SELECT generate_series(booking_record.check_in_date, booking_record.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            INSERT INTO public.daily_occupancy_metrics (
                room_type_id, metric_date, total_inventory,
                arrivals_count, inhouse_count, checkout_count
            )
            VALUES (
                room_type_id_val,
                current_date_val,
                total_rooms_count,
                CASE WHEN booking_record.check_in_date = current_date_val THEN 1 ELSE 0 END,
                CASE WHEN booking_record.room_status = 'checked_in' THEN 1 ELSE 0 END,
                CASE WHEN booking_record.check_out_date = current_date_val THEN 1 ELSE 0 END
            )
            ON CONFLICT (room_type_id, metric_date)
            DO UPDATE SET
                arrivals_count = daily_occupancy_metrics.arrivals_count + EXCLUDED.arrivals_count,
                inhouse_count = daily_occupancy_metrics.inhouse_count + EXCLUDED.inhouse_count,
                checkout_count = daily_occupancy_metrics.checkout_count + EXCLUDED.checkout_count;
        END LOOP;
    END LOOP;
    
    -- Initialize active_stays for all existing bookings
    FOR booking_record IN 
        SELECT br.*, r.room_type_id, b.guest_id
        FROM public.booking_rooms br
        JOIN public.rooms r ON br.room_id = r.id
        JOIN public.bookings b ON br.booking_id = b.id
        WHERE br.room_status IN ('reserved', 'checked_in')
    LOOP
        -- Insert active stays for each day in the booking period
        FOR current_date_val IN 
            SELECT generate_series(booking_record.check_in_date, booking_record.check_out_date - INTERVAL '1 day', INTERVAL '1 day')::date
        LOOP
            INSERT INTO public.active_stays (booking_id, room_id, room_type_id, guest_id, stay_date, status)
            VALUES (booking_record.booking_id, booking_record.room_id, booking_record.room_type_id, booking_record.guest_id, current_date_val, 'in_house')
            ON CONFLICT (booking_id, stay_date)
            DO UPDATE SET
                status = 'in_house',
                updated_at = now();
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10) Initialize availability data for existing bookings
SELECT public.initialize_availability_data();

-- 11) Add comments for documentation
COMMENT ON FUNCTION public.update_room_availability_realtime() IS 'Real-time room availability updates when bookings change';
COMMENT ON FUNCTION public.assign_best_available_room(uuid, date, date, integer) IS 'Auto-assign best available room with exact capacity matching';
COMMENT ON FUNCTION public.check_overbooking_availability(uuid, date, date) IS 'Check if overbooking is allowed within limits';
COMMENT ON FUNCTION public.get_upgrade_room_type(uuid) IS 'Get upgrade room type for overbooking situations';
COMMENT ON FUNCTION public.update_daily_occupancy_metrics() IS 'Update daily occupancy metrics for reporting';
COMMENT ON FUNCTION public.update_channel_summary() IS 'Update channel-specific booking summary';
COMMENT ON FUNCTION public.update_active_stays() IS 'Update active stays tracking for occupancy calculations';
COMMENT ON FUNCTION public.initialize_availability_data() IS 'Initialize availability data for existing bookings';
