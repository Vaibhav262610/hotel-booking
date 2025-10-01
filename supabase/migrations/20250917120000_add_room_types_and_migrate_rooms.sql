-- Add room_types table and migrate rooms to use canonical room types

-- 1) Create room_types table
CREATE TABLE IF NOT EXISTS public.room_types (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  base_price numeric(10,2) NOT NULL,
  beds smallint NOT NULL,
  baths smallint NOT NULL,
  max_pax smallint,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Seed the five canonical room types
INSERT INTO public.room_types (code, name, base_price, beds, baths, max_pax) VALUES
('deluxe', 'Deluxe', 799, 1, 1, 2),
('deluxe_triple', 'Deluxe Triple', 1499, 3, 1, 3),
('deluxe_quad', 'Deluxe Quad', 1999, 4, 1, 4),
('king_suite', 'King Suite', 2499, 2, 1, 2),
('residential_suite', 'Residential Suite', 2999, 3, 2, 3);

-- 3) Add room_type_id to rooms table
ALTER TABLE public.rooms 
ADD COLUMN room_type_id uuid REFERENCES public.room_types(id);

-- 4) Create index for performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON public.rooms(room_type_id);

-- 5) Backfill room_type_id and set default prices
-- Map existing room types to new canonical types (case-insensitive)
UPDATE public.rooms 
SET room_type_id = (
  SELECT rt.id 
  FROM public.room_types rt 
  WHERE LOWER(TRIM(rooms.type)) = LOWER(rt.code)
  LIMIT 1
)
WHERE rooms.type IS NOT NULL;

-- For any rooms that couldn't be mapped, default to 'deluxe'
UPDATE public.rooms 
SET room_type_id = (SELECT id FROM public.room_types WHERE code = 'deluxe')
WHERE room_type_id IS NULL;

-- Set default price to base_price for rooms with null price
UPDATE public.rooms 
SET price = rt.base_price
FROM public.room_types rt
WHERE rooms.room_type_id = rt.id 
AND (rooms.price IS NULL OR rooms.price = 0);

-- 6) Make room_type_id NOT NULL after backfill
ALTER TABLE public.rooms 
ALTER COLUMN room_type_id SET NOT NULL;

-- 7) Drop and recreate active_checkout_alerts view to use room_types relationship
DROP VIEW IF EXISTS public.active_checkout_alerts;
CREATE VIEW public.active_checkout_alerts AS
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
    "rt"."name"::character varying(50) AS "room_type",
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
     JOIN "public"."room_types" "rt" ON (("r"."room_type_id" = "rt"."id"))
  WHERE ("cn"."is_active" = true)
  ORDER BY "cn"."created_at" DESC;

-- 8) Drop the legacy type column
ALTER TABLE public.rooms 
DROP COLUMN type;

-- 9) Add trigger to update updated_at on room_types
CREATE OR REPLACE FUNCTION public.update_room_types_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_room_types_updated_at
BEFORE UPDATE ON public.room_types
FOR EACH ROW EXECUTE FUNCTION public.update_room_types_updated_at();

-- 10) Add helpful comments
COMMENT ON TABLE public.room_types IS 'Canonical room types with base pricing and capacity information';
COMMENT ON COLUMN public.room_types.code IS 'Unique identifier for room type (e.g., deluxe, king_suite)';
COMMENT ON COLUMN public.room_types.base_price IS 'Default base price for this room type';
COMMENT ON COLUMN public.room_types.max_pax IS 'Recommended maximum occupancy (flexible, not enforced)';
COMMENT ON COLUMN public.rooms.room_type_id IS 'References canonical room type from room_types table';