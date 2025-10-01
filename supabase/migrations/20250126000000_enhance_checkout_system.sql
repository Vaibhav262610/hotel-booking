-- Enhanced checkout system migration
-- Adds improved checkout functionality with notifications, grace periods, and late fees

-- 1. Ensure checkout_notifications table has all required columns
ALTER TABLE public.checkout_notifications 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkout_notifications_booking_id ON public.checkout_notifications (booking_id);
CREATE INDEX IF NOT EXISTS idx_checkout_notifications_type ON public.checkout_notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_checkout_notifications_active ON public.checkout_notifications (is_active);
CREATE INDEX IF NOT EXISTS idx_checkout_notifications_created_at ON public.checkout_notifications (created_at DESC);

-- 3. Add indexes for grace_period_tracker
CREATE INDEX IF NOT EXISTS idx_grace_period_tracker_booking_id ON public.grace_period_tracker (booking_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_tracker_active ON public.grace_period_tracker (is_active);
CREATE INDEX IF NOT EXISTS idx_grace_period_tracker_end ON public.grace_period_tracker (grace_period_end);

-- 4. Add indexes for late_checkout_charges
CREATE INDEX IF NOT EXISTS idx_late_checkout_charges_booking_id ON public.late_checkout_charges (booking_id);
CREATE INDEX IF NOT EXISTS idx_late_checkout_charges_applied_at ON public.late_checkout_charges (applied_at DESC);

-- 5. Create function to get active checkout alerts with room details
CREATE OR REPLACE FUNCTION public.get_active_checkout_alerts()
RETURNS TABLE (
    id UUID,
    booking_id UUID,
    guest_name VARCHAR(255),
    room_number VARCHAR(50),
    check_out_time TIMESTAMP WITH TIME ZONE,
    notification_type VARCHAR(50),
    message TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    dismissed_by UUID,
    booking_number VARCHAR(20),
    booking_status VARCHAR(20),
    guest_phone VARCHAR(20),
    room_type VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cn.id,
        cn.booking_id,
        cn.guest_name,
        cn.room_number,
        cn.check_out_time,
        cn.notification_type,
        cn.message,
        cn.is_active,
        cn.created_at,
        cn.dismissed_at,
        cn.dismissed_by,
        b.booking_number,
        b.status as booking_status,
        g.phone as guest_phone,
        rt.name as room_type
    FROM public.checkout_notifications cn
    JOIN public.bookings b ON cn.booking_id = b.id
    JOIN public.guests g ON b.guest_id = g.id
    LEFT JOIN public.booking_rooms br ON b.id = br.booking_id
    LEFT JOIN public.rooms r ON br.room_id = r.id
    LEFT JOIN public.room_types rt ON r.room_type_id = rt.id
    WHERE cn.is_active = true
    ORDER BY cn.created_at DESC;
END;
$$;

-- 6. Create function to process automated checkout notifications
CREATE OR REPLACE FUNCTION public.process_automated_checkout_notifications()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    booking_record RECORD;
    now_time TIMESTAMP WITH TIME ZONE := NOW();
    approaching_time TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '2 hours';
BEGIN
    -- Create approaching notifications for checkouts in next 2 hours
    FOR booking_record IN
        SELECT 
            b.id,
            b.booking_number,
            b.expected_checkout,
            g.name as guest_name,
            r.number as room_number
        FROM public.bookings b
        JOIN public.guests g ON b.guest_id = g.id
        JOIN public.booking_rooms br ON b.id = br.booking_id
        JOIN public.rooms r ON br.room_id = r.id
        WHERE b.status = 'checked_in'
        AND b.expected_checkout::date = approaching_time::date
        AND b.expected_checkout::time BETWEEN (approaching_time - INTERVAL '2 hours')::time AND approaching_time::time
        AND NOT EXISTS (
            SELECT 1 FROM public.checkout_notifications cn
            WHERE cn.booking_id = b.id
            AND cn.notification_type = 'approaching'
            AND cn.is_active = true
        )
    LOOP
        INSERT INTO public.checkout_notifications (
            booking_id,
            guest_name,
            room_number,
            check_out_time,
            notification_type,
            message,
            is_active
        ) VALUES (
            booking_record.id,
            booking_record.guest_name,
            booking_record.room_number,
            booking_record.expected_checkout,
            'approaching',
            'Guest ' || booking_record.guest_name || ' in room ' || booking_record.room_number || ' has checkout approaching in 2 hours'
        );
    END LOOP;

    -- Create overdue notifications for checkouts past due time
    FOR booking_record IN
        SELECT 
            b.id,
            b.booking_number,
            b.expected_checkout,
            g.name as guest_name,
            r.number as room_number
        FROM public.bookings b
        JOIN public.guests g ON b.guest_id = g.id
        JOIN public.booking_rooms br ON b.id = br.booking_id
        JOIN public.rooms r ON br.room_id = r.id
        WHERE b.status = 'checked_in'
        AND b.expected_checkout < now_time
        AND NOT EXISTS (
            SELECT 1 FROM public.checkout_notifications cn
            WHERE cn.booking_id = b.id
            AND cn.notification_type = 'overdue'
            AND cn.is_active = true
        )
    LOOP
        INSERT INTO public.checkout_notifications (
            booking_id,
            guest_name,
            room_number,
            check_out_time,
            notification_type,
            message,
            is_active
        ) VALUES (
            booking_record.id,
            booking_record.guest_name,
            booking_record.room_number,
            booking_record.expected_checkout,
            'overdue',
            'Guest ' || booking_record.guest_name || ' in room ' || booking_record.room_number || ' is overdue for checkout'
        );
    END LOOP;
END;
$$;

-- 7. Create function to calculate late checkout fees
CREATE OR REPLACE FUNCTION public.calculate_late_checkout_fee(
    p_booking_id UUID,
    p_actual_checkout TIMESTAMP WITH TIME ZONE,
    p_grace_period_minutes INTEGER DEFAULT 60,
    p_late_fee_per_hour DECIMAL DEFAULT 100.00,
    p_max_late_fee DECIMAL DEFAULT 500.00
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
    v_scheduled_checkout TIMESTAMP WITH TIME ZONE;
    v_late_minutes INTEGER;
    v_hours_late INTEGER;
    v_late_fee DECIMAL;
BEGIN
    -- Get scheduled checkout time
    SELECT expected_checkout INTO v_scheduled_checkout
    FROM public.bookings
    WHERE id = p_booking_id;

    IF v_scheduled_checkout IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate late minutes
    v_late_minutes := EXTRACT(EPOCH FROM (p_actual_checkout - v_scheduled_checkout)) / 60;

    -- If within grace period, no fee
    IF v_late_minutes <= p_grace_period_minutes THEN
        RETURN 0;
    END IF;

    -- Calculate hours late (excluding grace period)
    v_hours_late := CEIL((v_late_minutes - p_grace_period_minutes) / 60.0);

    -- Calculate fee
    v_late_fee := LEAST(v_hours_late * p_late_fee_per_hour, p_max_late_fee);

    RETURN GREATEST(v_late_fee, 0);
END;
$$;

-- 8. Create function to get checkout statistics
CREATE OR REPLACE FUNCTION public.get_checkout_statistics(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_checkouts INTEGER,
    on_time_checkouts INTEGER,
    late_checkouts INTEGER,
    grace_period_used INTEGER,
    total_late_fees DECIMAL,
    average_late_time DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '7 days');
    v_end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_checkouts,
        COUNT(*) FILTER (WHERE b.actual_check_out <= b.expected_checkout)::INTEGER as on_time_checkouts,
        COUNT(*) FILTER (WHERE b.actual_check_out > b.expected_checkout)::INTEGER as late_checkouts,
        COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM public.grace_period_tracker gpt 
            WHERE gpt.booking_id = b.id AND gpt.is_active = false
        ))::INTEGER as grace_period_used,
        COALESCE(SUM(lcc.late_checkout_fee), 0) as total_late_fees,
        COALESCE(AVG(EXTRACT(EPOCH FROM (b.actual_check_out - b.expected_checkout)) / 3600), 0) as average_late_time
    FROM public.bookings b
    LEFT JOIN public.late_checkout_charges lcc ON b.id = lcc.booking_id
    WHERE b.status = 'checked_out'
    AND b.actual_check_out::date BETWEEN v_start_date AND v_end_date;
END;
$$;

-- 9. Create trigger to update checkout_notifications updated_at
CREATE OR REPLACE FUNCTION public.update_checkout_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_checkout_notifications_updated_at
    BEFORE UPDATE ON public.checkout_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_checkout_notifications_updated_at();

-- 10. Add comments for documentation
COMMENT ON FUNCTION public.get_active_checkout_alerts() IS 'Returns all active checkout notifications with booking and room details';
COMMENT ON FUNCTION public.process_automated_checkout_notifications() IS 'Processes automated checkout notifications for approaching and overdue checkouts';
COMMENT ON FUNCTION public.calculate_late_checkout_fee(UUID, TIMESTAMP WITH TIME ZONE, INTEGER, DECIMAL, DECIMAL) IS 'Calculates late checkout fees based on grace period and hourly rates';
COMMENT ON FUNCTION public.get_checkout_statistics(DATE, DATE) IS 'Returns checkout statistics for a given date range';

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_active_checkout_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_automated_checkout_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_late_checkout_fee(UUID, TIMESTAMP WITH TIME ZONE, INTEGER, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_checkout_statistics(DATE, DATE) TO authenticated;
