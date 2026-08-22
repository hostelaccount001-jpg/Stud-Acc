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
