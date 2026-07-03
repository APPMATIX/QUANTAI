-- Item Comments for Collaboration (Phase 3)

create table if not exists public.item_comments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  element_id uuid not null, -- Can refer to either structural or architectural element
  element_type text not null check (element_type in ('structural', 'architectural')),
  user_id uuid references auth.users(id) on delete cascade not null,
  comment text not null,
  is_resolved boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.item_comments enable row level security;

-- Users can view comments on projects they have access to
create policy "Users can view comments on accessible projects"
  on public.item_comments for select
  using (
    exists (
      select 1 from public.projects
      where id = item_comments.project_id
      and company_id = (select company_id from public.users where id = auth.uid())
    )
  );

-- Users can insert comments on projects they have access to
create policy "Users can insert comments on accessible projects"
  on public.item_comments for insert
  with check (
    exists (
      select 1 from public.projects
      where id = project_id
      and company_id = (select company_id from public.users where id = auth.uid())
    )
  );

-- Users can update/resolve their own comments, or admins can resolve any
create policy "Users can update comments"
  on public.item_comments for update
  using (
    user_id = auth.uid() 
    or 
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
