-- Create cost_catalogue table
CREATE TABLE public.cost_catalogue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  item_code text,
  description text NOT NULL,
  unit text NOT NULL,
  rate numeric NOT NULL,
  category text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.cost_catalogue ENABLE ROW LEVEL SECURITY;

-- Policies for cost_catalogue
-- 1. All authenticated users can select (view) items belonging to their company
CREATE POLICY "Users can view company cost catalogue"
  ON public.cost_catalogue
  FOR SELECT
  TO authenticated
  USING (
    company_id = (
      SELECT company_id FROM public.users 
      WHERE users.id = auth.uid()
    )
  );

-- 2. Only admin and super_admin can insert items for their company
CREATE POLICY "Admins can insert company cost catalogue"
  ON public.cost_catalogue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (
      SELECT company_id FROM public.users 
      WHERE users.id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 3. Only admin and super_admin can update items for their company
CREATE POLICY "Admins can update company cost catalogue"
  ON public.cost_catalogue
  FOR UPDATE
  TO authenticated
  USING (
    company_id = (
      SELECT company_id FROM public.users 
      WHERE users.id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM public.users 
      WHERE users.id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 4. Only admin and super_admin can delete items for their company
CREATE POLICY "Admins can delete company cost catalogue"
  ON public.cost_catalogue
  FOR DELETE
  TO authenticated
  USING (
    company_id = (
      SELECT company_id FROM public.users 
      WHERE users.id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create function for updating modified time if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger
CREATE TRIGGER update_cost_catalogue_modtime
  BEFORE UPDATE ON public.cost_catalogue
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
