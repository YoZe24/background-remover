-- Background Remover Database Schema
-- Execute this in your Supabase SQL editor

-- Create processed_images table
CREATE TABLE IF NOT EXISTS processed_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_filename TEXT NOT NULL,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  dimensions JSONB, -- {width: number, height: number}
  processing_time_ms INTEGER,
  user_session_id TEXT, -- For anonymous users, can be linked to auth.users later
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours') -- Auto cleanup
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processed_images_status ON processed_images(status);
CREATE INDEX IF NOT EXISTS idx_processed_images_session ON processed_images(user_session_id);
CREATE INDEX IF NOT EXISTS idx_processed_images_created ON processed_images(created_at);
CREATE INDEX IF NOT EXISTS idx_processed_images_expires ON processed_images(expires_at);

-- Create storage bucket for processed images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'processed-images',
  'processed-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for original images (temporary)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'original-images',
  'original-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for public access
CREATE POLICY "Allow public uploads to original-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'original-images');

CREATE POLICY "Allow public uploads to processed-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'processed-images');

CREATE POLICY "Allow public read access to processed-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'processed-images');

CREATE POLICY "Allow public read access to original-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'original-images');

CREATE POLICY "Allow public delete from original-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'original-images');

CREATE POLICY "Allow public delete from processed-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'processed-images');

-- RLS policies for processed_images table
ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;

-- Allow read access for all (since we're using session-based approach for MVP)
CREATE POLICY "Allow public read access to processed_images"
ON processed_images FOR SELECT
USING (true);

-- Allow insert access for all
CREATE POLICY "Allow public insert to processed_images"
ON processed_images FOR INSERT
WITH CHECK (true);

-- Allow update access for all (needed for status updates)
CREATE POLICY "Allow public update to processed_images"
ON processed_images FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow delete access for all (for cleanup)
CREATE POLICY "Allow public delete from processed_images"
ON processed_images FOR DELETE
USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_processed_images_updated_at
  BEFORE UPDATE ON processed_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired images
CREATE OR REPLACE FUNCTION cleanup_expired_images()
RETURNS void AS $$
DECLARE
  expired_record RECORD;
BEGIN
  -- Get expired records
  FOR expired_record IN
    SELECT id, original_url, processed_url
    FROM processed_images
    WHERE expires_at < NOW()
  LOOP
    -- Delete from storage (implement in application layer)
    -- For now, just delete the database record
    DELETE FROM processed_images WHERE id = expired_record.id;
  END LOOP;
END;
$$ language 'plpgsql';

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-images', '0 */6 * * *', 'SELECT cleanup_expired_images();');
