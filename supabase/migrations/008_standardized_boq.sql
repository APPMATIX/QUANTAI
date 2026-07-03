-- 1. Drop old tables if they exist
DROP TABLE IF EXISTS public.structural_elements CASCADE;
DROP TABLE IF EXISTS public.architectural_elements CASCADE;

-- 2. Create boq_constants table
CREATE TABLE public.boq_constants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id uuid REFERENCES public.drawings(id) ON DELETE CASCADE,
  name text NOT NULL,
  value decimal,
  unit text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 3. Create boq_items table
CREATE TABLE public.boq_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id uuid REFERENCES public.drawings(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Substructure', 'Superstructure', 'Finishes', 'MEP')),
  description text NOT NULL,
  nos decimal,
  length_m decimal,
  width_m decimal,
  height_m decimal,
  quantity decimal NOT NULL,
  unit text,
  rate decimal DEFAULT 0,
  amount decimal DEFAULT 0,
  remarks text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. Enable Row Level Security
ALTER TABLE public.boq_constants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies for boq_constants
CREATE POLICY "Users can view their company's boq_constants"
  ON public.boq_constants FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));

CREATE POLICY "Users can create their company's boq_constants"
  ON public.boq_constants FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));

CREATE POLICY "Users can update their company's boq_constants"
  ON public.boq_constants FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));

CREATE POLICY "Users can delete their company's boq_constants"
  ON public.boq_constants FOR DELETE
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));

-- 6. Add Policies for boq_items
CREATE POLICY "Users can view their company's boq_items"
  ON public.boq_items FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));

CREATE POLICY "Users can create their company's boq_items"
  ON public.boq_items FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));

CREATE POLICY "Users can update their company's boq_items"
  ON public.boq_items FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));

CREATE POLICY "Users can delete their company's boq_items"
  ON public.boq_items FOR DELETE
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company() OR public.get_user_role() = 'super_admin'));
