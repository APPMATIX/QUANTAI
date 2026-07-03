-- Add logo_url column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS logo_url text;

-- Create company-logos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-logos
-- Allow public read access to company logos
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload company logos
CREATE POLICY "Admins can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update company logos
CREATE POLICY "Admins can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete company logos
CREATE POLICY "Admins can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);
