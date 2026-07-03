-- 006_strict_rls.sql

-- Drop existing complex policies on child tables
DROP POLICY IF EXISTS "Users can access company drawings" ON public.drawings;
DROP POLICY IF EXISTS "Users can insert drawings" ON public.drawings;
DROP POLICY IF EXISTS "Users can update drawings" ON public.drawings;

DROP POLICY IF EXISTS "Users can view company structural elements" ON public.structural_elements;
DROP POLICY IF EXISTS "Users can insert structural elements" ON public.structural_elements;
DROP POLICY IF EXISTS "Users can update structural elements" ON public.structural_elements;
DROP POLICY IF EXISTS "Users can delete structural elements" ON public.structural_elements;

DROP POLICY IF EXISTS "Users can view company arch elements" ON public.architectural_elements;
DROP POLICY IF EXISTS "Users can insert arch elements" ON public.architectural_elements;
DROP POLICY IF EXISTS "Users can update arch elements" ON public.architectural_elements;
DROP POLICY IF EXISTS "Users can delete arch elements" ON public.architectural_elements;

DROP POLICY IF EXISTS "Users can manage company exports" ON public.exports;

-- Recreate with STRICT company_id matching

-- DRAWINGS
CREATE POLICY "Drawings Strict Select" ON public.drawings FOR SELECT 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Drawings Strict Insert" ON public.drawings FOR INSERT 
WITH CHECK (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Drawings Strict Update" ON public.drawings FOR UPDATE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Drawings Strict Delete" ON public.drawings FOR DELETE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- STRUCTURAL
CREATE POLICY "Structural Strict Select" ON public.structural_elements FOR SELECT 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Structural Strict Insert" ON public.structural_elements FOR INSERT 
WITH CHECK (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Structural Strict Update" ON public.structural_elements FOR UPDATE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Structural Strict Delete" ON public.structural_elements FOR DELETE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- ARCHITECTURAL
CREATE POLICY "Architectural Strict Select" ON public.architectural_elements FOR SELECT 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Architectural Strict Insert" ON public.architectural_elements FOR INSERT 
WITH CHECK (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Architectural Strict Update" ON public.architectural_elements FOR UPDATE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

CREATE POLICY "Architectural Strict Delete" ON public.architectural_elements FOR DELETE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- EXPORTS
CREATE POLICY "Exports Strict All" ON public.exports FOR ALL 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- AUDIT LOGS
CREATE POLICY "Audit Logs View" ON public.audit_logs FOR SELECT
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');
