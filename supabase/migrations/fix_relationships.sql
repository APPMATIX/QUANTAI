DO $$
BEGIN
  -- Check and fix 'users' table
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_name = 'users' AND column_name = 'company_id' AND constraint_name LIKE '%fkey%'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;

  -- Check and fix 'projects' table
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_name = 'projects' AND column_name = 'company_id' AND constraint_name LIKE '%fkey%'
  ) THEN
    ALTER TABLE public.projects 
    ADD CONSTRAINT projects_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
