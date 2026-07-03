-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Companies (for Super Admin multi-tenancy)
create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- Users (mirrors Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('super_admin', 'admin', 'user')),
  company_id uuid references public.companies(id),
  created_at timestamptz default now()
);

-- Projects
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client text,
  location text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'processing', 'completed')),
  created_by uuid references public.users(id),
  company_id uuid references public.companies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Drawings
create table public.drawings (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz default now()
);

-- Structural Elements
create table public.structural_elements (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  drawing_id uuid references public.drawings(id),
  element text not null,     -- footing | column | beam | slab
  grid text,
  length_m decimal,
  width_m decimal,
  depth_m decimal,
  quantity decimal not null,
  unit text default 'm³',
  confidence text check (confidence in ('high', 'medium', 'low')),
  is_approved boolean default false,
  created_at timestamptz default now()
);

-- Architectural Elements
create table public.architectural_elements (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  drawing_id uuid references public.drawings(id),
  room text,
  category text not null,   -- walls | paint | flooring | ceiling
  quantity decimal not null,
  unit text default 'm²',
  confidence text check (confidence in ('high', 'medium', 'low')),
  is_approved boolean default false,
  created_at timestamptz default now()
);

-- Exports
create table public.exports (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  file_url text,
  export_type text default 'excel' check (export_type in ('excel', 'csv')),
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);
