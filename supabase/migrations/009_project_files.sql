-- Rename drawings to project_files
ALTER TABLE public.drawings RENAME TO project_files;

-- Add file_type to distinguish between input drawings and output reports
ALTER TABLE public.project_files 
  ADD COLUMN file_type text DEFAULT 'input' CHECK (file_type IN ('input', 'output', 'virtual_boq'));

-- Update existing records to be 'input'
UPDATE public.project_files SET file_type = 'input';

-- Rename the foreign key columns in boq tables for clarity
ALTER TABLE public.boq_items RENAME COLUMN drawing_id TO file_id;
ALTER TABLE public.boq_constants RENAME COLUMN drawing_id TO file_id;
