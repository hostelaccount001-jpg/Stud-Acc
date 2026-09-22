-- ====================================================================
-- GURUKUL KIOSK ERP: ALL-IN-ONE MASTER DATABASE SQL SETUP
-- Run this ENTIRE script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jjkxtgtbogtzhbuxutag/sql
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create app_role ENUM type safely
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Students Table (with Fingerprints JSONB & Fast Indexes)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    nfc_no TEXT NOT NULL,
    class_name TEXT,
    room_no TEXT,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    fingerprints JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fingerprints JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS room_no TEXT;

CREATE INDEX IF NOT EXISTS idx_students_fingerprints ON public.students USING gin (fingerprints);
CREATE INDEX IF NOT EXISTS idx_students_suid ON public.students (suid);
CREATE INDEX IF NOT EXISTS idx_students_nfc_no ON public.students (nfc_no);

-- 4. User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- 6. Settings Table (Kiosk Configuration & User Permissions)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    daily_limit INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    print_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no BIGSERIAL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    suid TEXT NOT NULL,
    nfc_no TEXT NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_service_id ON public.transactions (service_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON public.transactions (student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_suid ON public.transactions (suid);

-- 9. Auto-Confirm New Users Trigger (Removes Email Rate Limits & Verification barrier)
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS trigger AS $$
BEGIN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auto_confirm_user();

-- Auto-confirm any existing unconfirmed users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 10. Sync Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 11. RPC Function: Admin Create Staff User (Zero Bearer Token & Zero Rate Limit Issues)
CREATE OR REPLACE FUNCTION public.admin_create_staff_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = lower(trim(p_email));
    IF new_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        lower(trim(p_email)),
        crypt(p_password, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', p_full_name),
        NOW(),
        NOW()
    );

    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (new_user_id, lower(trim(p_email)), p_full_name, NOW())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC Function: Admin Reset Password
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC Function: Admin Delete User
CREATE OR REPLACE FUNCTION public.admin_delete_staff_user(
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant Execute Permissions to all roles
GRANT EXECUTE ON FUNCTION public.admin_create_staff_user(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_user(UUID) TO anon, authenticated, service_role;

-- 15. Enable Row Level Security (RLS) & Full Open Access Policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_all_access" ON public.students;
CREATE POLICY "students_all_access" ON public.students FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_full_access" ON public.profiles;
CREATE POLICY "profiles_full_access" ON public.profiles FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_full_access" ON public.user_roles;
CREATE POLICY "user_roles_full_access" ON public.user_roles FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_full_access" ON public.settings;
CREATE POLICY "settings_full_access" ON public.settings FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_full_access" ON public.services;
CREATE POLICY "services_full_access" ON public.services FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_all_access" ON public.transactions;
CREATE POLICY "transactions_all_access" ON public.transactions FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);
