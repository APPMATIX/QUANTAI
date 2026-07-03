-- Allow company admins to update their own company's details
DROP POLICY IF EXISTS "Admins can update their own company" ON public.companies;
CREATE POLICY "Admins can update their own company" 
  ON public.companies FOR UPDATE 
  USING (id = public.get_user_company() AND public.get_user_role() = 'admin');

-- Allow users to update their own profile details
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
  ON public.users FOR UPDATE 
  USING (id = auth.uid());
