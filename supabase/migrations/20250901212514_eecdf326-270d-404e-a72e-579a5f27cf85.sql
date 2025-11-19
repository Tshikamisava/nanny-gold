-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatar uploads
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()));

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()));

CREATE POLICY "Admins can manage all avatars" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'avatars' AND is_admin());