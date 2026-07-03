-- Insert dummy company
INSERT INTO public.companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Quantify Platform Admin')
ON CONFLICT (id) DO NOTHING;

-- Note: The auth.users insertion is usually done via Supabase Auth API (sign up).
-- For local testing or direct seeding, we'd need to insert into auth.users first,
-- then into public.users. Since auth.users is managed by Supabase, the best way 
-- to seed a super_admin in production is:
-- 1. Sign up normally or invite user via Supabase dashboard
-- 2. Run this SQL command in SQL Editor:
-- UPDATE public.users SET role = 'super_admin', company_id = '00000000-0000-0000-0000-000000000000' WHERE email = 'admin@example.com';
