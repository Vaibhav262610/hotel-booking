# Database Setup Guide

## Issue: Missing Housekeeping Tasks Table

The system is currently failing to create housekeeping tasks because the `housekeeping_tasks` table does not exist in your database.

## Quick Fix

### Option 1: Run the SQL Script (Recommended)

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/create-housekeeping-table.sql`
4. Click **Run** to execute the script

### Option 2: Manual Table Creation

Execute this SQL in your Supabase SQL Editor:

```sql
-- Create housekeeping_tasks table
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number VARCHAR(20) NOT NULL UNIQUE,
  hotel_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id),
  assigned_to UUID REFERENCES staff(id),
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  estimated_time INTEGER NOT NULL DEFAULT 45,
  notes TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_id ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_status ON housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_assigned_to ON housekeeping_tasks(assigned_to);

-- Enable Row Level Security
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON housekeeping_tasks TO authenticated;
GRANT ALL ON housekeeping_tasks TO service_role;
```

## What This Fixes

- ✅ Housekeeping task creation will work properly
- ✅ Tasks will be stored in the database
- ✅ Task history will be preserved
- ✅ Full CRUD operations will be available
- ✅ Reports will show actual task data

## Current Behavior

Until you create the table, the system will:
- Create temporary/mock tasks
- Show success messages
- Display warnings about missing database table
- Log detailed error information in the console

## Verification

After running the SQL script:
1. Go to **Rooms** section
2. Try to create a housekeeping task
3. Check if the task appears in the housekeeping list
4. Verify no more error messages about missing tables

## Need Help?

If you continue to have issues:
1. Check the browser console for detailed error messages
2. Verify the table was created in Supabase Dashboard → Table Editor
3. Ensure your database connection is working properly
