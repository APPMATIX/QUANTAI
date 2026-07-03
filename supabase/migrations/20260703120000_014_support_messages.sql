-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users see their own messages; admins see all
CREATE POLICY "Users can view their own messages" ON public.support_messages
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Insert Policy: Users can only send messages as themselves
CREATE POLICY "Users can insert their own messages" ON public.support_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Update Policy: For marking as read
CREATE POLICY "Admins can update messages" ON public.support_messages
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Create support-attachments bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for support-attachments
CREATE POLICY "Anyone can view support attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'support-attachments');

CREATE POLICY "Authenticated users can upload support attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'support-attachments' AND 
    auth.role() = 'authenticated'
  );
