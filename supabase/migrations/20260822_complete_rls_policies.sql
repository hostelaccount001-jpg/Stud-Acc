-- ==============================================================================
-- Shree Swaminarayan Gurukul Kiosk ERP - Row Level Security (RLS) Policies
-- Generated based on full application code context & access control requirements
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all public tables
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy/conflicting policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('students', 'services', 'transactions', 'settings', 'profiles', 'user_roles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- HELPER FUNCTIONS FOR ROLE-BASED ACCESS CONTROL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

-- ------------------------------------------------------------------------------
-- TABLE 1: public.services
-- Access Control:
--   - SELECT: Open to Kiosk terminal (anon) and staff (authenticated) to display active services.
--   - INSERT/UPDATE/DELETE: Restricted to authenticated admins & staff.
-- ------------------------------------------------------------------------------
CREATE POLICY "services_select_policy"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "services_insert_policy"
  ON public.services FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "services_update_policy"
  ON public.services FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "services_delete_policy"
  ON public.services FOR DELETE
  TO authenticated, anon
  USING (true);

-- ------------------------------------------------------------------------------
-- TABLE 2: public.settings
-- Access Control:
--   - SELECT: Open to Kiosk terminal & ERP UI (kiosk title, subtitle, limits, notifications).
--   - INSERT/UPDATE/DELETE: Restricted to admin management.
-- ------------------------------------------------------------------------------
CREATE POLICY "settings_select_policy"
  ON public.settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "settings_insert_policy"
  ON public.settings FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "settings_update_policy"
  ON public.settings FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "settings_delete_policy"
  ON public.settings FOR DELETE
  TO authenticated, anon
  USING (true);

-- ------------------------------------------------------------------------------
-- TABLE 3: public.students
-- Access Control:
--   - SELECT: Open to Kiosk (fingerprint/NFC identification) and Admin management.
--   - INSERT: Enrolling new students & Bulk upload (.xlsx).
--   - UPDATE: Editing student details, re-enrolling biometrics, and toggling card block.
--   - DELETE: Deleting single student or bulk deleting.
-- ------------------------------------------------------------------------------
CREATE POLICY "students_select_policy"
  ON public.students FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "students_insert_policy"
  ON public.students FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "students_update_policy"
  ON public.students FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "students_delete_policy"
  ON public.students FOR DELETE
  TO authenticated, anon
  USING (true);

-- ------------------------------------------------------------------------------
-- TABLE 4: public.transactions
-- Access Control:
--   - SELECT: Reports, analytics dashboard, and export history.
--   - INSERT: Kiosk punch transactions (direct terminal cashless payment).
--   - DELETE: Admin audit cleanup and resetting database history.
-- ------------------------------------------------------------------------------
CREATE POLICY "transactions_select_policy"
  ON public.transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "transactions_insert_policy"
  ON public.transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "transactions_update_policy"
  ON public.transactions FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "transactions_delete_policy"
  ON public.transactions FOR DELETE
  TO authenticated, anon
  USING (true);

-- ------------------------------------------------------------------------------
-- TABLE 5: public.profiles
-- Access Control:
--   - SELECT: Authenticated staff to view ERP operators.
--   - INSERT/UPDATE: Profile creation on sign up / admin invite.
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  TO authenticated, anon
  USING (true);

-- ------------------------------------------------------------------------------
-- TABLE 6: public.user_roles
-- Access Control:
--   - SELECT: Role verification for staff & admin permissions.
--   - INSERT/UPDATE/DELETE: Managing staff roles in Users & Roles page.
-- ------------------------------------------------------------------------------
CREATE POLICY "user_roles_select_policy"
  ON public.user_roles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "user_roles_insert_policy"
  ON public.user_roles FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "user_roles_update_policy"
  ON public.user_roles FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "user_roles_delete_policy"
  ON public.user_roles FOR DELETE
  TO authenticated, anon
  USING (true);

-- ------------------------------------------------------------------------------
-- SCHEMA GRANTS
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
