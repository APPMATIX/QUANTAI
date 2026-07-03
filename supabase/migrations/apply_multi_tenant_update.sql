-- 004_multi_tenant_schema.sql

-- Expand Companies Table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS time_zone text,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_start_date date,
  ADD COLUMN IF NOT EXISTS subscription_expiry_date date,
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive'));

-- Expand Users Table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS force_password_reset boolean DEFAULT false;

-- Add company_id to all existing child tables to enforce direct tenant isolation
ALTER TABLE public.drawings
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.structural_elements
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.architectural_elements
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.exports
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Storage Bucket for Company Assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "Public Access to Company Assets" ON storage.objects;
CREATE POLICY "Public Access to Company Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Super Admins can manage Company Assets" ON storage.objects;
CREATE POLICY "Super Admins can manage Company Assets"
ON storage.objects FOR ALL
USING (bucket_id = 'company-assets' AND public.get_user_role() = 'super_admin');
-- 005_audit_logs.sql

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_entity_id text;
BEGIN
  v_user_id := auth.uid();
  
  -- Determine entity ID safely
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::text;
  ELSE
    v_entity_id := NEW.id::text;
  END IF;

  -- Determine company ID safely
  IF TG_TABLE_NAME = 'companies' THEN
    v_company_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  ELSE
    -- All other tables now have company_id
    v_company_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END;
  END IF;

  INSERT INTO public.audit_logs (user_id, company_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    v_company_id,
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    jsonb_build_object(
      'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to main tables
DROP TRIGGER IF EXISTS audit_companies ON public.companies;
CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_users ON public.users;
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_projects ON public.projects;
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_drawings ON public.drawings;
CREATE TRIGGER audit_drawings AFTER INSERT OR UPDATE OR DELETE ON public.drawings FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_structural ON public.structural_elements;
CREATE TRIGGER audit_structural AFTER INSERT OR UPDATE OR DELETE ON public.structural_elements FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_architectural ON public.architectural_elements;
CREATE TRIGGER audit_architectural AFTER INSERT OR UPDATE OR DELETE ON public.architectural_elements FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
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
DROP POLICY IF EXISTS "Drawings Strict Select" ON public.drawings;
CREATE POLICY "Drawings Strict Select" ON public.drawings FOR SELECT 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Drawings Strict Insert" ON public.drawings;
CREATE POLICY "Drawings Strict Insert" ON public.drawings FOR INSERT 
WITH CHECK (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Drawings Strict Update" ON public.drawings;
CREATE POLICY "Drawings Strict Update" ON public.drawings FOR UPDATE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Drawings Strict Delete" ON public.drawings;
CREATE POLICY "Drawings Strict Delete" ON public.drawings FOR DELETE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- STRUCTURAL
DROP POLICY IF EXISTS "Structural Strict Select" ON public.structural_elements;
CREATE POLICY "Structural Strict Select" ON public.structural_elements FOR SELECT 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Structural Strict Insert" ON public.structural_elements;
CREATE POLICY "Structural Strict Insert" ON public.structural_elements FOR INSERT 
WITH CHECK (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Structural Strict Update" ON public.structural_elements;
CREATE POLICY "Structural Strict Update" ON public.structural_elements FOR UPDATE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Structural Strict Delete" ON public.structural_elements;
CREATE POLICY "Structural Strict Delete" ON public.structural_elements FOR DELETE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- ARCHITECTURAL
DROP POLICY IF EXISTS "Architectural Strict Select" ON public.architectural_elements;
CREATE POLICY "Architectural Strict Select" ON public.architectural_elements FOR SELECT 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Architectural Strict Insert" ON public.architectural_elements;
CREATE POLICY "Architectural Strict Insert" ON public.architectural_elements FOR INSERT 
WITH CHECK (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Architectural Strict Update" ON public.architectural_elements;
CREATE POLICY "Architectural Strict Update" ON public.architectural_elements FOR UPDATE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Architectural Strict Delete" ON public.architectural_elements;
CREATE POLICY "Architectural Strict Delete" ON public.architectural_elements FOR DELETE 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- EXPORTS
DROP POLICY IF EXISTS "Exports Strict All" ON public.exports;
CREATE POLICY "Exports Strict All" ON public.exports FOR ALL 
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');

-- AUDIT LOGS
DROP POLICY IF EXISTS "Audit Logs View" ON public.audit_logs;
CREATE POLICY "Audit Logs View" ON public.audit_logs FOR SELECT
USING (company_id = get_user_company() OR get_user_role() = 'super_admin');
