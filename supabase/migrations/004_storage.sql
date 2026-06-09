-- ============================================================
-- STORAGE BUCKETS CONFIGURATION
-- Migration: 004_storage.sql
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('order-images', 'order-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('signatures', 'signatures', false, 1048576, ARRAY['image/png', 'image/jpeg']),
  ('invoices', 'invoices', false, 5242880, ARRAY['application/pdf']);

-- Order images storage policies
CREATE POLICY "order_images_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'order-images' AND (
      auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "order_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'order-images' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "order_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'order-images' AND auth.uid() IS NOT NULL
  );

-- Avatars storage policies
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Signatures storage policies
CREATE POLICY "signatures_manage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'signatures' AND auth.uid() IS NOT NULL
  );

-- Invoices storage policies
CREATE POLICY "invoices_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoices' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "invoices_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices' AND auth.uid() IS NOT NULL
  );
