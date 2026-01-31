-- PRO SmartBuild Storage Bucket Setup
-- Migration: 002_storage_bucket.sql
-- Description: Create storage bucket for business logos
-- Note: Run this in Supabase Dashboard SQL Editor or via Supabase CLI

-- ============================================
-- CREATE LOGOS BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES FOR LOGOS BUCKET
-- ============================================

-- Policy: Users can upload to their own folder (user_id/filename)
CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view logos (they're public for PDFs/invoices)
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Policy: Users can update their own logo
CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own logo
CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
