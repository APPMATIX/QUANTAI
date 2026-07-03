-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cost Catalog for Tenant-specific pricing
create table if not exists public.cost_catalog (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade not null,
  category text not null check (category in ('structural', 'architectural')),
  item_name text not null, -- e.g. 'column', 'beam', 'walls', 'paint'
  unit_rate decimal not null default 0.0,
  unit text not null, -- e.g. 'm3', 'm2', 'kg'
  currency text not null default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, category, item_name)
);

-- Enable RLS
alter table public.cost_catalog enable row level security;

-- Policies for cost_catalog
create policy "Users can view cost catalog for their company"
  on public.cost_catalog for select
  using (company_id = public.get_user_company() or public.get_user_role() = 'super_admin');

create policy "Admins can manage cost catalog for their company"
  on public.cost_catalog for all
  using (
    (company_id = public.get_user_company() and public.get_user_role() = 'admin')
    or public.get_user_role() = 'super_admin'
  );

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.cost_catalog
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add triggers for audit logs
CREATE TRIGGER audit_cost_catalog
AFTER INSERT OR UPDATE OR DELETE ON public.cost_catalog
FOR EACH ROW
EXECUTE FUNCTION public.audit_log_trigger();
