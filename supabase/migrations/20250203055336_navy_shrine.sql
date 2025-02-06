/*
  # Create storage bucket for memes

  1. Storage
    - Creates a new public storage bucket named 'memes' for storing meme images
    - Enables public access to the stored images
*/

-- Create a new storage bucket for memes
INSERT INTO storage.buckets (id, name, public)
VALUES ('memes', 'memes', true);

-- Allow public access to the memes bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'memes');

-- Allow authenticated uploads to the memes bucket
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'memes');