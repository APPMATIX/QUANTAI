-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.projects enable row level security;
alter table public.drawings enable row level security;
alter table public.structural_elements enable row level security;
alter table public.architectural_elements enable row level security;
alter table public.exports enable row level security;

-- Helper function: get current user role
create or replace function public.get_user_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer;

-- Helper function: get current user company
create or replace function public.get_user_company()
returns uuid as $$
  select company_id from public.users where id = auth.uid();
$$ language sql security definer;

-- USERS
create policy "Users can view users in same company"
  on public.users for select
  using (company_id = get_user_company() or get_user_role() = 'super_admin');

create policy "Super admin can manage users"
  on public.users for all
  using (get_user_role() = 'super_admin');

-- COMPANIES
create policy "Users can view their own company"
  on public.companies for select
  using (id = get_user_company() or get_user_role() = 'super_admin');

create policy "Super admin can manage companies"
  on public.companies for all
  using (get_user_role() = 'super_admin');

-- PROJECTS
create policy "Users see company projects"
  on public.projects for select
  using (company_id = get_user_company() or get_user_role() = 'super_admin');

create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = created_by);

create policy "Users can update company projects"
  on public.projects for update
  using (company_id = get_user_company() or get_user_role() = 'super_admin');

create policy "Admins can delete projects"
  on public.projects for delete
  using (get_user_role() in ('admin', 'super_admin'));

-- DRAWINGS
create policy "Users can access company drawings"
  on public.drawings for select
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can insert drawings"
  on public.drawings for insert
  with check (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can update drawings"
  on public.drawings for update
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

-- STRUCTURAL ELEMENTS
create policy "Users can view company structural elements"
  on public.structural_elements for select
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can insert structural elements"
  on public.structural_elements for insert
  with check (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can update structural elements"
  on public.structural_elements for update
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can delete structural elements"
  on public.structural_elements for delete
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

-- ARCHITECTURAL ELEMENTS
create policy "Users can view company arch elements"
  on public.architectural_elements for select
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can insert arch elements"
  on public.architectural_elements for insert
  with check (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can update arch elements"
  on public.architectural_elements for update
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

create policy "Users can delete arch elements"
  on public.architectural_elements for delete
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));

-- EXPORTS
create policy "Users can manage company exports"
  on public.exports for all
  using (project_id in (select id from public.projects where company_id = get_user_company() or get_user_role() = 'super_admin'));
