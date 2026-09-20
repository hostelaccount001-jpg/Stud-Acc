-- ============================================================================
-- SUPABASE POSTGRESQL PRODUCTION SCHEMA & MIGRATION SCRIPT (100% IDEMPOTENT)
-- Target: Student Verification & Service Kiosk ERP System
-- ============================================================================

-- Enable Vector Extension (for Face Biometric Embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Admins Table (Multi-Admin Architecture & RBAC)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'SUB_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'SUB_ADMIN')),
    permissions JSONB NOT NULL DEFAULT '{
        "reports": true,
        "manage_prices": false,
        "surveillance": false,
        "students": true,
        "face_reg": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure missing columns exist if table was previously created
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Students Master Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suid TEXT UNIQUE NOT NULL,
    nfc_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    standard TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    face_vector JSONB DEFAULT '[]'::jsonb,
    face_embedding vector(128), -- Legacy face vector
    fingerprint_template TEXT, -- Mantra MFS 100 ISO 19794-2 Base64 Fingerprint Template
    fingerprint_image TEXT, -- Base64 Fingerprint Bitmap Image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fingerprint_template TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fingerprint_image TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS face_embedding vector(128);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- 3. Service Prices & Item Controls Table
CREATE TABLE IF NOT EXISTS public.service_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT UNIQUE NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0.00,
    fixed_amounts JSONB NOT NULL DEFAULT '[10, 20, 50]'::jsonb,
    allow_custom_keypad BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.service_prices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.service_prices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. ERP Kiosk Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.service_prices(id) ON DELETE SET NULL,
    nfc_code TEXT NOT NULL,
    suid TEXT NOT NULL,
    student_name TEXT NOT NULL,
    standard TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    service_description TEXT NOT NULL,
    status TEXT DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS service_id UUID;

-- 5. Unmatched Security Scans Log Table
CREATE TABLE IF NOT EXISTS public.unmatched_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT DEFAULT 'KIOSK-01',
    captured_image_data TEXT,
    snapshot_url TEXT,
    attempted_nfc TEXT DEFAULT 'NFC-UNKNOWN',
    attempted_suid TEXT DEFAULT 'SUID-UNMATCHED',
    alert_reason TEXT NOT NULL DEFAULT 'Discrepancy Detected',
    failure_reason TEXT DEFAULT 'Biometric Mismatch',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.unmatched_scans ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT 'KIOSK-01';
ALTER TABLE public.unmatched_scans ADD COLUMN IF NOT EXISTS snapshot_url TEXT;
ALTER TABLE public.unmatched_scans ADD COLUMN IF NOT EXISTS failure_reason TEXT DEFAULT 'Biometric Mismatch';

-- 6. Attendance Table for Real-Time AI Face Recognition Check-in
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    status TEXT NOT NULL DEFAULT 'present',
    method TEXT NOT NULL DEFAULT 'face',
    confidence_score NUMERIC(5,2),
    distance NUMERIC(6,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure face_encoding JSONB exists in students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS face_encoding JSONB;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (SAFE / IDEMPOTENT)
-- ============================================================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unmatched_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read/Write for Attendance') THEN
        CREATE POLICY "Public Read/Write for Attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read/Write for Admins') THEN
        CREATE POLICY "Public Read/Write for Admins" ON public.admins FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read/Write for Students') THEN
        CREATE POLICY "Public Read/Write for Students" ON public.students FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read/Write for Service Prices') THEN
        CREATE POLICY "Public Read/Write for Service Prices" ON public.service_prices FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read/Write for Transactions') THEN
        CREATE POLICY "Public Read/Write for Transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read/Write for Unmatched Scans') THEN
        CREATE POLICY "Public Read/Write for Unmatched Scans" ON public.unmatched_scans FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS PUBLICATION (SAFE / IDEMPOTENT)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_publication p ON p.oid = pr.prpubid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'admins'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_publication p ON p.oid = pr.prpubid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'students'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_publication p ON p.oid = pr.prpubid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'service_prices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_prices;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_publication p ON p.oid = pr.prpubid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_publication p ON p.oid = pr.prpubid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'unmatched_scans'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.unmatched_scans;
    END IF;
END $$;

-- ============================================================================
-- INITIAL SEED DATA (SAFE OVERRIDE WITH ON CONFLICT DO NOTHING)
-- ============================================================================
INSERT INTO public.admins (id, name, email, username, role, permissions)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Principal Admin', 'admin@school.edu', 'admin', 'SUPER_ADMIN', '{
        "reports": true,
        "manage_prices": true,
        "surveillance": true,
        "students": true,
        "face_reg": true
    }'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'Kiosk Operator', 'operator@school.edu', 'operator', 'SUB_ADMIN', '{
        "reports": true,
        "manage_prices": false,
        "surveillance": false,
        "students": true,
        "face_reg": true
    }'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.service_prices (service_name, fixed_amounts, allow_custom_keypad, price, is_active)
VALUES 
    ('Store Purchase', '[10, 20, 50, 100]'::jsonb, true, 50.00, true),
    ('Hair Cutting', '[30, 50]'::jsonb, false, 50.00, true),
    ('Harish Jayanti', '[10, 20, 50, 100, 200]'::jsonb, true, 10.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.students (suid, nfc_code, name, standard, mobile_number, face_vector)
VALUES 
    ('SUID-1001', 'NFC-9901', 'Aarav Sharma', 'Std 10-A', '+91 9876543210', '[0.12, 0.45, 0.78, 0.33, 0.91]'::jsonb),
    ('SUID-1002', 'NFC-9902', 'Priya Patel', 'Std 10-B', '+91 9876543211', '[0.22, 0.35, 0.68, 0.53, 0.81]'::jsonb),
    ('SUID-1003', 'NFC-9903', 'Rohan Verma', 'Std 9-A', '+91 9876543212', '[0.32, 0.25, 0.58, 0.63, 0.71]'::jsonb)
ON CONFLICT DO NOTHING;
