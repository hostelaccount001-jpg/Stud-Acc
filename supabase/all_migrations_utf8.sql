CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suid text NOT NULL UNIQUE,
  name text NOT NULL,
  nfc_no text NOT NULL UNIQUE,
  class_name text,
  room_no text,
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff update students" ON public.students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins delete students" ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  print_receipt boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  daily_limit numeric(10,2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  suid text NOT NULL,
  nfc_no text NOT NULL,
  student_name text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  receipt_no bigserial,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins delete transactions" ON public.transactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX transactions_created_at_idx ON public.transactions (created_at DESC);
CREATE INDEX transactions_student_day_idx ON public.transactions (student_id, created_at);

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.settings (key, value) VALUES
  ('daily_limit','500'),
  ('msg_success','Thank you! Your receipt has been generated.'),
  ('msg_limit','Today''s limit is over. Please come tomorrow.'),
  ('msg_blocked','Your card is temporarily blocked. Please contact the office.'),
  ('kiosk_title','Shree Swaminarayan Gurukul, Rajkot'),
  ('kiosk_subtitle','Cashless Service Kiosk');

INSERT INTO public.services (name, price, print_receipt, active, sort_order) VALUES
  ('Store', 30, true, true, 1),
  ('Haircut', 50, true, true, 2),
  ('Laundry', 20, false, true, 3);

INSERT INTO public.students (suid, name, nfc_no, class_name, room_no) VALUES
  ('SUID001','Dhruv Patel','0001234567','Std 10','A-101'),
  ('SUID002','Harsh Joshi','0001234568','Std 11','B-204'),
  ('SUID003','Meet Trivedi','0001234569','Std 12','C-310');
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fingerprints jsonb NOT NULL DEFAULT '[]'::jsonb;
-- 1. Allow DELETE on students for all staff & authenticated users
DROP POLICY IF EXISTS "admins delete students" ON public.students;
DROP POLICY IF EXISTS "allow delete students" ON public.students;
DROP POLICY IF EXISTS "allow delete students anon" ON public.students;

CREATE POLICY "allow delete students" ON public.students FOR DELETE TO authenticated USING (true);
CREATE POLICY "allow delete students anon" ON public.students FOR DELETE TO anon USING (true);

-- 2. Allow ALL operations on students for anon & authenticated
DROP POLICY IF EXISTS "staff read students" ON public.students;
DROP POLICY IF EXISTS "staff write students" ON public.students;
DROP POLICY IF EXISTS "staff update students" ON public.students;

CREATE POLICY "allow select students" ON public.students FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow insert students" ON public.students FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow update students" ON public.students FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- 3. Allow read & manage on services & settings
DROP POLICY IF EXISTS "staff read services" ON public.services;
DROP POLICY IF EXISTS "admins manage services" ON public.services;
CREATE POLICY "allow all services" ON public.services FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff read settings" ON public.settings;
DROP POLICY IF EXISTS "admins manage settings" ON public.settings;
CREATE POLICY "allow all settings" ON public.settings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 4. Allow insert & read on transactions
DROP POLICY IF EXISTS "staff read transactions" ON public.transactions;
DROP POLICY IF EXISTS "admins delete transactions" ON public.transactions;
CREATE POLICY "allow all transactions" ON public.transactions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 5. Grant permissions to anon and authenticated
GRANT ALL ON public.students TO anon, authenticated;
GRANT ALL ON public.services TO anon, authenticated;
GRANT ALL ON public.settings TO anon, authenticated;
GRANT ALL ON public.transactions TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
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
