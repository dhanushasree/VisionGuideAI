-- Fix: FK constraints were pointing to auth.users instead of public.users
-- Our backend uses a custom public.users table, not Supabase auth
-- Drop the broken constraints and re-add them pointing to public.users explicitly

ALTER TABLE emergency_contacts  DROP CONSTRAINT IF EXISTS emergency_contacts_user_id_fkey;
ALTER TABLE articles            DROP CONSTRAINT IF EXISTS articles_user_id_fkey;
ALTER TABLE commands            DROP CONSTRAINT IF EXISTS commands_user_id_fkey;
ALTER TABLE navigation_requests DROP CONSTRAINT IF EXISTS navigation_requests_user_id_fkey;
ALTER TABLE sos_alerts          DROP CONSTRAINT IF EXISTS sos_alerts_user_id_fkey;
ALTER TABLE saved_locations     DROP CONSTRAINT IF EXISTS saved_locations_user_id_fkey;
ALTER TABLE user_feedback       DROP CONSTRAINT IF EXISTS user_feedback_user_id_fkey;

ALTER TABLE emergency_contacts  ADD CONSTRAINT emergency_contacts_user_id_fkey  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE articles            ADD CONSTRAINT articles_user_id_fkey            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE commands            ADD CONSTRAINT commands_user_id_fkey            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE navigation_requests ADD CONSTRAINT navigation_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE sos_alerts          ADD CONSTRAINT sos_alerts_user_id_fkey          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE saved_locations     ADD CONSTRAINT saved_locations_user_id_fkey     FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE user_feedback       ADD CONSTRAINT user_feedback_user_id_fkey       FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
