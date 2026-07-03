-- Create the 'drawings' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('drawings', 'drawings', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the drawings bucket
-- Allow authenticated users to insert files
CREATE POLICY "Authenticated users can upload drawings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'drawings');

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view drawings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'drawings');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update drawings"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'drawings');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete drawings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'drawings');
