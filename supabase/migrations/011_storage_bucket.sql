-- Public bucket for profile/store media (avatars, covers, logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vora-uploads',
  'vora-uploads',
  true,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "vora_uploads_public_read" ON storage.objects;
DROP POLICY IF EXISTS "vora_uploads_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "vora_uploads_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "vora_uploads_auth_delete" ON storage.objects;

CREATE POLICY "vora_uploads_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vora-uploads');

CREATE POLICY "vora_uploads_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vora-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "vora_uploads_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vora-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "vora_uploads_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vora-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
