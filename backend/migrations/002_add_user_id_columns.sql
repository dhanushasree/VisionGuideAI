-- Migration: Add user_id column to all user-owned tables
-- Run this in Supabase > SQL Editor if your tables already exist
-- This fixes multi-user data isolation

ALTER TABLE emergency_contacts  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE articles             ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE commands             ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE navigation_requests  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sos_alerts           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE saved_locations      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_feedback        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Indexes for faster user-scoped queries
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id   ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_user_id             ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_user_id             ON commands(user_id);
CREATE INDEX IF NOT EXISTS idx_navigation_requests_user_id  ON navigation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id           ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id      ON saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id        ON user_feedback(user_id);
