-- Migration 001: create users table
-- Run once in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste → Run

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email)
);

-- Fast lookup by email on every login
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Row Level Security: enabled but permissive for the backend anon key.
-- The real security boundary is the Express API (JWT + API-key auth).
-- Direct Supabase access from the browser is not exposed to users.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backend_full_access" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);
