-- ====================================================================
-- GURUKUL KIOSK ERP: SUPABASE USER MANAGEMENT, ROLES & AUTH SETUP
-- Run this query in Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Enable pgcrypto extension for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create app_role ENUM type safely
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- 5. Ensure settings table exists (used for granular user permissions & kiosk config)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Trigger to automatically confirm all new user emails (so login works immediately)
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

-- 7. Trigger to automatically sync auth.users to public.profiles
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

-- 8. RPC Function: Admin Create Staff User (Bypasses service_role bearer token requirements)
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

    -- CRITICAL: Insert into auth.identities so Supabase GoTrue signInWithPassword can authenticate the user
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', lower(trim(p_email))),
        'email',
        lower(trim(p_email)),
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC Function: Admin Reset Password
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

-- 10. RPC Function: Admin Delete User
CREATE OR REPLACE FUNCTION public.admin_delete_staff_user(
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC Function: Admin Repair Auth Identities (Fixes existing users who can't log in)
CREATE OR REPLACE FUNCTION public.admin_repair_auth_identities()
RETURNS INTEGER AS $$
DECLARE
    repaired_count INTEGER;
BEGIN
    WITH inserted AS (
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        SELECT
            id,
            id,
            jsonb_build_object('sub', id::text, 'email', lower(email)),
            'email',
            lower(email),
            NOW(),
            NOW(),
            NOW()
        FROM auth.users
        WHERE id NOT IN (SELECT user_id FROM auth.identities)
        ON CONFLICT (provider, provider_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO repaired_count FROM inserted;
    RETURN repaired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant Execute Permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.admin_create_staff_user(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_repair_auth_identities() TO anon, authenticated, service_role;

-- 13. Enable Row Level Security (RLS) & Grant Full Access Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_full_access" ON public.profiles;
CREATE POLICY "profiles_full_access" ON public.profiles FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_full_access" ON public.user_roles;
CREATE POLICY "user_roles_full_access" ON public.user_roles FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_full_access" ON public.settings;
CREATE POLICY "settings_full_access" ON public.settings FOR ALL TO public, authenticated, anon USING (true) WITH CHECK (true);

-- 14. Execute repair immediately for all existing users (e.g. users already created in auth.users)
SELECT public.admin_repair_auth_identities();
