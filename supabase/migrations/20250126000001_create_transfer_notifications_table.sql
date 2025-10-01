-- Create transfer_notifications table for tracking room transfer notifications
-- This table stores all notifications sent for room transfers (guest, housekeeping, management)

-- 1) Enable pgcrypto if not already (for gen_random_uuid)
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END $$;

-- 2) Create transfer_notifications table
CREATE TABLE IF NOT EXISTS public.transfer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(50) NOT NULL CHECK (type IN ('guest_notification', 'housekeeping_notification', 'management_notification')),
  recipient varchar(255) NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status varchar(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  transfer_id uuid REFERENCES public.room_transfers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  
  -- Ensure valid notification types
  CONSTRAINT valid_notification_type CHECK (type IN ('guest_notification', 'housekeeping_notification', 'management_notification')),
  
  -- Ensure valid status
  CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'failed'))
);

-- 3) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfer_notifications_type ON public.transfer_notifications (type);
CREATE INDEX IF NOT EXISTS idx_transfer_notifications_status ON public.transfer_notifications (status);
CREATE INDEX IF NOT EXISTS idx_transfer_notifications_transfer_id ON public.transfer_notifications (transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_notifications_booking_id ON public.transfer_notifications (booking_id);
CREATE INDEX IF NOT EXISTS idx_transfer_notifications_created_at ON public.transfer_notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_transfer_notifications_recipient ON public.transfer_notifications (recipient);

-- 4) Create updated_at trigger
CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transfer_notifications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.transfer_notifications ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_transfer_notifications_set_updated_at ON public.transfer_notifications;
CREATE TRIGGER trg_transfer_notifications_set_updated_at
  BEFORE UPDATE ON public.transfer_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();

-- 5) Create function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION public.cleanup_old_transfer_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications older than 1 year
  DELETE FROM public.transfer_notifications 
  WHERE created_at < now() - interval '1 year';
END;
$$ LANGUAGE plpgsql;

-- 6) Add helpful comments
COMMENT ON TABLE public.transfer_notifications IS 'Stores all notifications sent for room transfers';
COMMENT ON COLUMN public.transfer_notifications.type IS 'Type of notification: guest, housekeeping, or management';
COMMENT ON COLUMN public.transfer_notifications.recipient IS 'Email address or identifier of the notification recipient';
COMMENT ON COLUMN public.transfer_notifications.status IS 'Current status of the notification: pending, sent, or failed';
COMMENT ON COLUMN public.transfer_notifications.transfer_id IS 'Reference to the room transfer that triggered this notification';
COMMENT ON COLUMN public.transfer_notifications.booking_id IS 'Reference to the booking associated with the transfer';
