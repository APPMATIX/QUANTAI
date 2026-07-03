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
