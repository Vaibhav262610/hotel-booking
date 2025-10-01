

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_payment_transaction"("p_booking_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_transaction_type" character varying, "p_collected_by" "uuid" DEFAULT NULL::"uuid", "p_reference_number" character varying DEFAULT NULL::character varying, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    transaction_id UUID;
BEGIN
    -- Insert payment transaction
    INSERT INTO payment_transactions (
        booking_id,
        amount,
        payment_method,
        transaction_type,
        collected_by,
        reference_number,
        notes
    ) VALUES (
        p_booking_id,
        p_amount,
        p_payment_method,
        p_transaction_type,
        p_collected_by,
        p_reference_number,
        p_notes
    ) RETURNING id INTO transaction_id;
    
    -- Update booking advance_amount if it's an advance or remaining payment
    IF p_transaction_type IN ('advance', 'remaining') THEN
        UPDATE bookings 
        SET advance_amount = advance_amount + p_amount
        WHERE id = p_booking_id;
    END IF;
    
    -- Log the payment collection
    IF p_collected_by IS NOT NULL THEN
        INSERT INTO staff_logs (
            hotel_id,
            staff_id,
            action,
            details,
            ip_address
        ) VALUES (
            '550e8400-e29b-41d4-a716-446655440000',
            p_collected_by,
            'payment_collected',
            format('Collected %s payment of ₹%s via %s for booking %s', 
                   p_transaction_type, p_amount, p_payment_method, p_booking_id)
        );
    END IF;
    
    RETURN transaction_id;
END;
$$;


ALTER FUNCTION "public"."add_payment_transaction"("p_booking_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_transaction_type" character varying, "p_collected_by" "uuid", "p_reference_number" character varying, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_loyalty_points"("amount" numeric) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 1 point per 100 currency units spent
    RETURN FLOOR(amount / 100);
END;
$$;


ALTER FUNCTION "public"."calculate_loyalty_points"("amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_remaining_balance"("booking_uuid" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_paid DECIMAL(10,2);
    final_amount DECIMAL(10,2);
BEGIN
    -- Get total amount paid
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payment_transactions 
    WHERE booking_id = booking_uuid 
    AND transaction_type IN ('advance', 'remaining', 'additional')
    AND status = 'completed';
    
    -- Get final amount from booking
    SELECT COALESCE(final_amount, total_amount) INTO final_amount
    FROM bookings 
    WHERE id = booking_uuid;
    
    RETURN GREATEST(0, final_amount - total_paid);
END;
$$;


ALTER FUNCTION "public"."calculate_remaining_balance"("booking_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_checkout_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Archive notifications older than 30 days
    UPDATE checkout_notifications 
    SET is_active = false 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_active = true;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up old checkout notifications';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_checkout_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_checkout_statistics"("start_date" "date" DEFAULT (CURRENT_DATE - '7 days'::interval), "end_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("total_notifications" integer, "approaching_count" integer, "overdue_count" integer, "grace_period_count" integer, "late_charges_count" integer, "total_late_fees" numeric, "average_grace_period_hours" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_notifications,
        COUNT(*) FILTER (WHERE cn.notification_type = 'approaching')::INTEGER as approaching_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'overdue')::INTEGER as overdue_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'grace_period')::INTEGER as grace_period_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'late_charges')::INTEGER as late_charges_count,
        COALESCE(SUM(lcc.late_checkout_fee), 0) as total_late_fees,
        COALESCE(
            AVG(
                EXTRACT(EPOCH FROM (gpt.grace_period_end - gpt.grace_period_start)) / 3600
            ), 0
        )::DECIMAL(5,2) as average_grace_period_hours
    FROM checkout_notifications cn
    LEFT JOIN late_checkout_charges lcc ON cn.booking_id = lcc.booking_id
    LEFT JOIN grace_period_tracker gpt ON cn.booking_id = gpt.booking_id
    WHERE cn.created_at::DATE BETWEEN start_date AND end_date;
END;
$$;


ALTER FUNCTION "public"."get_checkout_statistics"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_guest_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update guest statistics when a booking is completed
    IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
        UPDATE guests 
        SET 
            total_stays = total_stays + 1,
            total_spent = total_spent + COALESCE(NEW.final_amount, NEW.total_amount),
            last_stay_date = NEW.check_out
        WHERE id = NEW.guest_id;
        
        -- Insert visit record
        INSERT INTO guest_visits (
            guest_id, 
            booking_id, 
            check_in_date, 
            check_out_date, 
            room_type,
            total_amount
        ) VALUES (
            NEW.guest_id,
            NEW.id,
            NEW.check_in,
            NEW.check_out,
            (SELECT type FROM rooms WHERE id = NEW.room_id),
            COALESCE(NEW.final_amount, NEW.total_amount)
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_guest_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_loyalty_tier"("guest_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_points INTEGER;
    new_tier VARCHAR(20);
BEGIN
    SELECT points_earned - points_redeemed - points_expired INTO total_points
    FROM guest_loyalty 
    WHERE guest_id = guest_uuid;
    
    -- Determine tier based on points
    IF total_points >= 1000 THEN
        new_tier := 'platinum';
    ELSIF total_points >= 500 THEN
        new_tier := 'gold';
    ELSIF total_points >= 200 THEN
        new_tier := 'silver';
    ELSE
        new_tier := 'bronze';
    END IF;
    
    -- Update tier if changed
    UPDATE guest_loyalty 
    SET tier = new_tier, tier_upgrade_date = CURRENT_DATE
    WHERE guest_id = guest_uuid AND tier != new_tier;
END;
$$;


ALTER FUNCTION "public"."update_loyalty_tier"("guest_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_number" character varying(20) NOT NULL,
    "hotel_id" "uuid",
    "guest_id" "uuid",
    "room_id" "uuid",
    "staff_id" "uuid",
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'confirmed'::character varying,
    "total_amount" numeric(10,2),
    "advance_amount" numeric(10,2) DEFAULT 0,
    "payment_method" character varying(50),
    "arrival_type" character varying(50),
    "special_requests" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "actual_check_out" timestamp with time zone,
    "price_adjustment" numeric(10,2) DEFAULT 0,
    "final_amount" numeric(10,2),
    "checkout_notes" "text",
    "actual_check_in" timestamp with time zone,
    "check_in_notes" "text",
    "remaining_balance_collected" numeric(10,2) DEFAULT 0,
    "remaining_balance_collected_by" "uuid",
    "remaining_balance_payment_method" character varying(50)
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "guest_name" character varying(255) NOT NULL,
    "room_number" character varying(50) NOT NULL,
    "check_out_time" timestamp with time zone NOT NULL,
    "notification_type" character varying(50) NOT NULL,
    "message" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "dismissed_at" timestamp with time zone,
    "dismissed_by" "uuid",
    CONSTRAINT "checkout_notifications_notification_type_check" CHECK ((("notification_type")::"text" = ANY ((ARRAY['approaching'::character varying, 'overdue'::character varying, 'grace_period'::character varying, 'late_charges'::character varying])::"text"[]))),
    CONSTRAINT "idx_checkout_notifications_active" CHECK ((("is_active" = true) OR ("dismissed_at" IS NOT NULL)))
);


ALTER TABLE "public"."checkout_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."checkout_notifications" IS 'Stores checkout-related notifications for staff';



COMMENT ON COLUMN "public"."checkout_notifications"."notification_type" IS 'Type of notification: approaching, overdue, grace_period, late_charges';



COMMENT ON COLUMN "public"."checkout_notifications"."is_active" IS 'Whether the notification is still active and visible';



COMMENT ON COLUMN "public"."checkout_notifications"."dismissed_at" IS 'When the notification was dismissed by staff';



COMMENT ON COLUMN "public"."checkout_notifications"."dismissed_by" IS 'Staff member who dismissed the notification';



CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255),
    "phone" character varying(20),
    "address" "text",
    "id_type" character varying(50),
    "id_number" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "title" character varying(10) DEFAULT 'Mr.'::character varying,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "date_of_birth" "date",
    "nationality" character varying(50),
    "passport_number" character varying(50),
    "company" character varying(100),
    "designation" character varying(100),
    "emergency_contact_name" character varying(100),
    "emergency_contact_phone" character varying(20),
    "emergency_contact_relationship" character varying(50),
    "guest_category" character varying(20) DEFAULT 'regular'::character varying,
    "loyalty_points" integer DEFAULT 0,
    "total_stays" integer DEFAULT 0,
    "total_spent" numeric(12,2) DEFAULT 0,
    "last_stay_date" "date",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "notes" "text"
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid",
    "number" character varying(10) NOT NULL,
    "type" character varying(50) NOT NULL,
    "floor" integer,
    "capacity" integer,
    "price" numeric(10,2),
    "status" character varying(20) DEFAULT 'available'::character varying,
    "amenities" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_checkout_alerts" AS
 SELECT "cn"."id",
    "cn"."booking_id",
    "cn"."guest_name",
    "cn"."room_number" AS "notification_room_number",
    "cn"."check_out_time",
    "cn"."notification_type",
    "cn"."message",
    "cn"."created_at",
    "b"."booking_number",
    "b"."status" AS "booking_status",
    "g"."phone" AS "guest_phone",
    "r"."number" AS "room_number",
    "r"."type" AS "room_type",
        CASE
            WHEN (("cn"."notification_type")::"text" = 'approaching'::"text") THEN 'yellow'::"text"
            WHEN (("cn"."notification_type")::"text" = 'overdue'::"text") THEN 'orange'::"text"
            WHEN (("cn"."notification_type")::"text" = 'grace_period'::"text") THEN 'blue'::"text"
            WHEN (("cn"."notification_type")::"text" = 'late_charges'::"text") THEN 'red'::"text"
            ELSE 'gray'::"text"
        END AS "alert_color",
        CASE
            WHEN (("cn"."notification_type")::"text" = 'approaching'::"text") THEN 'clock'::"text"
            WHEN (("cn"."notification_type")::"text" = 'overdue'::"text") THEN 'alert-triangle'::"text"
            WHEN (("cn"."notification_type")::"text" = 'grace_period'::"text") THEN 'clock'::"text"
            WHEN (("cn"."notification_type")::"text" = 'late_charges'::"text") THEN 'dollar-sign'::"text"
            ELSE 'bell'::"text"
        END AS "alert_icon"
   FROM ((("public"."checkout_notifications" "cn"
     JOIN "public"."bookings" "b" ON (("cn"."booking_id" = "b"."id")))
     JOIN "public"."guests" "g" ON (("b"."guest_id" = "g"."id")))
     JOIN "public"."rooms" "r" ON (("b"."room_id" = "r"."id")))
  WHERE ("cn"."is_active" = true)
  ORDER BY "cn"."created_at" DESC;


ALTER VIEW "public"."active_checkout_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "payment_method" character varying(50) NOT NULL,
    "transaction_type" character varying(20) NOT NULL,
    "collected_by" "uuid",
    "transaction_date" timestamp with time zone DEFAULT "now"(),
    "reference_number" character varying(100),
    "notes" "text",
    "status" character varying(20) DEFAULT 'completed'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."booking_payment_summary" AS
 SELECT "b"."id" AS "booking_id",
    "b"."booking_number",
    "b"."total_amount",
    "b"."advance_amount",
    "b"."final_amount",
    "b"."price_adjustment",
    COALESCE("sum"(
        CASE
            WHEN (("pt"."transaction_type")::"text" = 'advance'::"text") THEN "pt"."amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_advance_paid",
    COALESCE("sum"(
        CASE
            WHEN (("pt"."transaction_type")::"text" = 'remaining'::"text") THEN "pt"."amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_remaining_paid",
    COALESCE("sum"(
        CASE
            WHEN (("pt"."transaction_type")::"text" = 'refund'::"text") THEN "pt"."amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_refunds",
    COALESCE("sum"(
        CASE
            WHEN (("pt"."transaction_type")::"text" = 'additional'::"text") THEN "pt"."amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_additional_charges",
    "count"("pt"."id") AS "total_transactions",
    "string_agg"(DISTINCT ("pt"."payment_method")::"text", ', '::"text") AS "payment_methods_used"
   FROM ("public"."bookings" "b"
     LEFT JOIN "public"."payment_transactions" "pt" ON (("b"."id" = "pt"."booking_id")))
  GROUP BY "b"."id", "b"."booking_number", "b"."total_amount", "b"."advance_amount", "b"."final_amount", "b"."price_adjustment";


ALTER VIEW "public"."booking_payment_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_session" character varying(100) NOT NULL,
    "role" character varying(20) NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grace_period_tracker" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "original_check_out" timestamp with time zone NOT NULL,
    "grace_period_start" timestamp with time zone NOT NULL,
    "grace_period_end" timestamp with time zone NOT NULL,
    "late_charges" numeric(10,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "idx_grace_period_active" CHECK ((("is_active" = true) OR ("late_charges" > (0)::numeric)))
);


ALTER TABLE "public"."grace_period_tracker" OWNER TO "postgres";


COMMENT ON TABLE "public"."grace_period_tracker" IS 'Tracks grace periods for overdue checkouts';



COMMENT ON COLUMN "public"."grace_period_tracker"."grace_period_start" IS 'When the grace period started (when checkout time passed)';



COMMENT ON COLUMN "public"."grace_period_tracker"."grace_period_end" IS 'When the grace period ends (1 hour after start)';



COMMENT ON COLUMN "public"."grace_period_tracker"."late_charges" IS 'Late checkout fees applied after grace period expired';



CREATE TABLE IF NOT EXISTS "public"."guest_communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid",
    "staff_id" "uuid",
    "communication_type" character varying(20) NOT NULL,
    "subject" character varying(255),
    "message" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'sent'::character varying,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_communications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid",
    "document_type" character varying(50) NOT NULL,
    "document_number" character varying(100),
    "document_url" "text",
    "expiry_date" "date",
    "is_verified" boolean DEFAULT false,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid",
    "booking_id" "uuid",
    "rating" integer,
    "category" character varying(50),
    "feedback_text" "text",
    "is_anonymous" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "guest_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."guest_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_loyalty" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid",
    "tier" character varying(20) DEFAULT 'bronze'::character varying,
    "points_earned" integer DEFAULT 0,
    "points_redeemed" integer DEFAULT 0,
    "points_expired" integer DEFAULT 0,
    "tier_upgrade_date" "date",
    "last_activity_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_loyalty" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid",
    "preference_type" character varying(50) NOT NULL,
    "preference_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_special_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid",
    "booking_id" "uuid",
    "request_type" character varying(50) NOT NULL,
    "request_details" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "assigned_to" "uuid",
    "fulfilled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_special_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid",
    "booking_id" "uuid",
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "room_type" character varying(50),
    "total_amount" numeric(10,2),
    "points_earned" integer DEFAULT 0,
    "special_requests_count" integer DEFAULT 0,
    "feedback_rating" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "address" "text",
    "phone" character varying(20),
    "email" character varying(255),
    "currency" character varying(10) DEFAULT 'INR'::character varying,
    "timezone" character varying(50) DEFAULT 'Asia/Kolkata'::character varying,
    "language" character varying(10) DEFAULT 'en'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."housekeeping_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_number" character varying(20) NOT NULL,
    "hotel_id" "uuid",
    "room_id" "uuid",
    "assigned_to" "uuid",
    "type" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "estimated_time" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."housekeeping_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."late_checkout_charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "original_amount" numeric(10,2) NOT NULL,
    "late_checkout_fee" numeric(10,2) NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "reason" "text" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."late_checkout_charges" OWNER TO "postgres";


COMMENT ON TABLE "public"."late_checkout_charges" IS 'Records late checkout fees applied to bookings';



COMMENT ON COLUMN "public"."late_checkout_charges"."original_amount" IS 'Original booking amount before late fees';



COMMENT ON COLUMN "public"."late_checkout_charges"."late_checkout_fee" IS 'Fee charged for late checkout';



COMMENT ON COLUMN "public"."late_checkout_charges"."total_amount" IS 'Total amount including late fees';



CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reservation_number" character varying(20) NOT NULL,
    "hotel_id" "uuid",
    "guest_id" "uuid",
    "room_id" "uuid",
    "staff_id" "uuid",
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'confirmed'::character varying,
    "total_amount" numeric(10,2),
    "advance_amount" numeric(10,2) DEFAULT 0,
    "payment_method" character varying(50),
    "arrival_type" character varying(50),
    "special_requests" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid",
    "category" character varying(50) NOT NULL,
    "key" character varying(100) NOT NULL,
    "value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid",
    "name" character varying(255) NOT NULL,
    "email" character varying(255),
    "phone" character varying(20),
    "role" character varying(50) NOT NULL,
    "department" character varying(50),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "join_date" "date" DEFAULT CURRENT_DATE,
    "last_login" timestamp with time zone,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hotel_id" "uuid",
    "staff_id" "uuid",
    "action" character varying(255) NOT NULL,
    "details" "text",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_number_key" UNIQUE ("booking_number");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_notifications"
    ADD CONSTRAINT "checkout_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grace_period_tracker"
    ADD CONSTRAINT "grace_period_tracker_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_communications"
    ADD CONSTRAINT "guest_communications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_documents"
    ADD CONSTRAINT "guest_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_feedback"
    ADD CONSTRAINT "guest_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_loyalty"
    ADD CONSTRAINT "guest_loyalty_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_preferences"
    ADD CONSTRAINT "guest_preferences_guest_id_preference_type_key" UNIQUE ("guest_id", "preference_type");



ALTER TABLE ONLY "public"."guest_preferences"
    ADD CONSTRAINT "guest_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_special_requests"
    ADD CONSTRAINT "guest_special_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_visits"
    ADD CONSTRAINT "guest_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_task_number_key" UNIQUE ("task_number");



ALTER TABLE ONLY "public"."checkout_notifications"
    ADD CONSTRAINT "idx_checkout_notifications_booking_id" UNIQUE ("booking_id", "notification_type", "is_active");



ALTER TABLE ONLY "public"."grace_period_tracker"
    ADD CONSTRAINT "idx_grace_period_booking_id" UNIQUE ("booking_id", "is_active");



ALTER TABLE ONLY "public"."late_checkout_charges"
    ADD CONSTRAINT "late_checkout_charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_reservation_number_key" UNIQUE ("reservation_number");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_hotel_id_number_key" UNIQUE ("hotel_id", "number");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_hotel_id_category_key_key" UNIQUE ("hotel_id", "category", "key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff_logs"
    ADD CONSTRAINT "staff_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_bookings_actual_check_out" ON "public"."bookings" USING "btree" ("actual_check_out");



CREATE INDEX "idx_bookings_check_in" ON "public"."bookings" USING "btree" ("check_in");



CREATE INDEX "idx_bookings_final_amount" ON "public"."bookings" USING "btree" ("final_amount");



CREATE INDEX "idx_bookings_hotel_id" ON "public"."bookings" USING "btree" ("hotel_id");



CREATE INDEX "idx_bookings_price_adjustment" ON "public"."bookings" USING "btree" ("price_adjustment");



CREATE INDEX "idx_bookings_remaining_balance" ON "public"."bookings" USING "btree" ("remaining_balance_collected");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_checkout_notifications_created_at" ON "public"."checkout_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_checkout_notifications_type_active" ON "public"."checkout_notifications" USING "btree" ("notification_type", "is_active");



CREATE INDEX "idx_grace_period_tracker_active" ON "public"."grace_period_tracker" USING "btree" ("is_active");



CREATE INDEX "idx_grace_period_tracker_end" ON "public"."grace_period_tracker" USING "btree" ("grace_period_end");



CREATE INDEX "idx_guest_communications_created_at" ON "public"."guest_communications" USING "btree" ("created_at");



CREATE INDEX "idx_guest_communications_guest_id" ON "public"."guest_communications" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_communications_type" ON "public"."guest_communications" USING "btree" ("communication_type");



CREATE INDEX "idx_guest_documents_guest_id" ON "public"."guest_documents" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_feedback_booking_id" ON "public"."guest_feedback" USING "btree" ("booking_id");



CREATE INDEX "idx_guest_feedback_guest_id" ON "public"."guest_feedback" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_loyalty_guest_id" ON "public"."guest_loyalty" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_preferences_guest_id" ON "public"."guest_preferences" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_preferences_type" ON "public"."guest_preferences" USING "btree" ("preference_type");



CREATE INDEX "idx_guest_special_requests_booking_id" ON "public"."guest_special_requests" USING "btree" ("booking_id");



CREATE INDEX "idx_guest_special_requests_guest_id" ON "public"."guest_special_requests" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_visits_check_in_date" ON "public"."guest_visits" USING "btree" ("check_in_date");



CREATE INDEX "idx_guest_visits_guest_id" ON "public"."guest_visits" USING "btree" ("guest_id");



CREATE INDEX "idx_guests_category" ON "public"."guests" USING "btree" ("guest_category");



CREATE INDEX "idx_guests_email" ON "public"."guests" USING "btree" ("email");



CREATE INDEX "idx_guests_phone" ON "public"."guests" USING "btree" ("phone");



CREATE INDEX "idx_guests_status" ON "public"."guests" USING "btree" ("status");



CREATE INDEX "idx_housekeeping_tasks_hotel_id" ON "public"."housekeeping_tasks" USING "btree" ("hotel_id");



CREATE INDEX "idx_housekeeping_tasks_status" ON "public"."housekeeping_tasks" USING "btree" ("status");



CREATE INDEX "idx_late_checkout_charges_applied_at" ON "public"."late_checkout_charges" USING "btree" ("applied_at" DESC);



CREATE INDEX "idx_late_checkout_charges_booking_id" ON "public"."late_checkout_charges" USING "btree" ("booking_id");



CREATE INDEX "idx_payment_transactions_booking_id" ON "public"."payment_transactions" USING "btree" ("booking_id");



CREATE INDEX "idx_payment_transactions_date" ON "public"."payment_transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_payment_transactions_method" ON "public"."payment_transactions" USING "btree" ("payment_method");



CREATE INDEX "idx_payment_transactions_type" ON "public"."payment_transactions" USING "btree" ("transaction_type");



CREATE INDEX "idx_reservations_check_in" ON "public"."reservations" USING "btree" ("check_in");



CREATE INDEX "idx_reservations_hotel_id" ON "public"."reservations" USING "btree" ("hotel_id");



CREATE INDEX "idx_rooms_hotel_id" ON "public"."rooms" USING "btree" ("hotel_id");



CREATE INDEX "idx_rooms_status" ON "public"."rooms" USING "btree" ("status");



CREATE INDEX "idx_staff_logs_created_at" ON "public"."staff_logs" USING "btree" ("created_at");



CREATE INDEX "idx_staff_logs_hotel_id" ON "public"."staff_logs" USING "btree" ("hotel_id");



CREATE OR REPLACE TRIGGER "trigger_update_guest_stats" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_guest_stats"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_remaining_balance_collected_by_fkey" FOREIGN KEY ("remaining_balance_collected_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_notifications"
    ADD CONSTRAINT "checkout_notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_notifications"
    ADD CONSTRAINT "checkout_notifications_dismissed_by_fkey" FOREIGN KEY ("dismissed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."grace_period_tracker"
    ADD CONSTRAINT "grace_period_tracker_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_communications"
    ADD CONSTRAINT "guest_communications_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_communications"
    ADD CONSTRAINT "guest_communications_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."guest_documents"
    ADD CONSTRAINT "guest_documents_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_documents"
    ADD CONSTRAINT "guest_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."guest_feedback"
    ADD CONSTRAINT "guest_feedback_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_feedback"
    ADD CONSTRAINT "guest_feedback_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_loyalty"
    ADD CONSTRAINT "guest_loyalty_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_preferences"
    ADD CONSTRAINT "guest_preferences_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_special_requests"
    ADD CONSTRAINT "guest_special_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."guest_special_requests"
    ADD CONSTRAINT "guest_special_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_special_requests"
    ADD CONSTRAINT "guest_special_requests_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_visits"
    ADD CONSTRAINT "guest_visits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_visits"
    ADD CONSTRAINT "guest_visits_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."late_checkout_charges"
    ADD CONSTRAINT "late_checkout_charges_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_logs"
    ADD CONSTRAINT "staff_logs_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_logs"
    ADD CONSTRAINT "staff_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_payment_transaction"("p_booking_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_transaction_type" character varying, "p_collected_by" "uuid", "p_reference_number" character varying, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_payment_transaction"("p_booking_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_transaction_type" character varying, "p_collected_by" "uuid", "p_reference_number" character varying, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_payment_transaction"("p_booking_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_transaction_type" character varying, "p_collected_by" "uuid", "p_reference_number" character varying, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_loyalty_points"("amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_loyalty_points"("amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_loyalty_points"("amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_remaining_balance"("booking_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_remaining_balance"("booking_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_remaining_balance"("booking_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_checkout_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_checkout_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_checkout_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_checkout_statistics"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_checkout_statistics"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_checkout_statistics"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guest_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_guest_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guest_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_loyalty_tier"("guest_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_loyalty_tier"("guest_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_loyalty_tier"("guest_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_notifications" TO "anon";
GRANT ALL ON TABLE "public"."checkout_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON TABLE "public"."active_checkout_alerts" TO "anon";
GRANT ALL ON TABLE "public"."active_checkout_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."active_checkout_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."payment_transactions" TO "anon";
GRANT ALL ON TABLE "public"."payment_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."booking_payment_summary" TO "anon";
GRANT ALL ON TABLE "public"."booking_payment_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_payment_summary" TO "service_role";



GRANT ALL ON TABLE "public"."chat_history" TO "anon";
GRANT ALL ON TABLE "public"."chat_history" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_history" TO "service_role";



GRANT ALL ON TABLE "public"."grace_period_tracker" TO "anon";
GRANT ALL ON TABLE "public"."grace_period_tracker" TO "authenticated";
GRANT ALL ON TABLE "public"."grace_period_tracker" TO "service_role";



GRANT ALL ON TABLE "public"."guest_communications" TO "anon";
GRANT ALL ON TABLE "public"."guest_communications" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_communications" TO "service_role";



GRANT ALL ON TABLE "public"."guest_documents" TO "anon";
GRANT ALL ON TABLE "public"."guest_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_documents" TO "service_role";



GRANT ALL ON TABLE "public"."guest_feedback" TO "anon";
GRANT ALL ON TABLE "public"."guest_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."guest_loyalty" TO "anon";
GRANT ALL ON TABLE "public"."guest_loyalty" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_loyalty" TO "service_role";



GRANT ALL ON TABLE "public"."guest_preferences" TO "anon";
GRANT ALL ON TABLE "public"."guest_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."guest_special_requests" TO "anon";
GRANT ALL ON TABLE "public"."guest_special_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_special_requests" TO "service_role";



GRANT ALL ON TABLE "public"."guest_visits" TO "anon";
GRANT ALL ON TABLE "public"."guest_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_visits" TO "service_role";



GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";



GRANT ALL ON TABLE "public"."housekeeping_tasks" TO "anon";
GRANT ALL ON TABLE "public"."housekeeping_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."housekeeping_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."late_checkout_charges" TO "anon";
GRANT ALL ON TABLE "public"."late_checkout_charges" TO "authenticated";
GRANT ALL ON TABLE "public"."late_checkout_charges" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_logs" TO "anon";
GRANT ALL ON TABLE "public"."staff_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
