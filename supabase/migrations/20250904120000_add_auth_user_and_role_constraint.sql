-- Link staff to auth.users and constrain roles to Owner/Admin/Employee
-- Safe guards: add column if missing, then add constraints conditionally

DO $$
BEGIN
  -- Add auth_user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.staff
      ADD COLUMN auth_user_id uuid;
  END IF;

  -- Add unique constraint on auth_user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_auth_user_id_key'
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_auth_user_id_key UNIQUE (auth_user_id);
  END IF;

  -- Add FK to auth.users if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_auth_user_id_fkey FOREIGN KEY (auth_user_id)
      REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Ensure role check constraint allows existing roles in the system
  -- Drop if exists (safe) then recreate with expanded set
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_role_check_allowed_values'
  ) THEN
    ALTER TABLE public.staff DROP CONSTRAINT staff_role_check_allowed_values;
  END IF;

  ALTER TABLE public.staff
    ADD CONSTRAINT staff_role_check_allowed_values
    CHECK (role IN (
      'Owner',
      'Admin',
      'Employee',
      'Front Office Staff',
      'Housekeeping Manager',
      'Housekeeping Staff'
    ));
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON public.staff(auth_user_id);


