/*
  # Fresh Database Setup for MemeShare

  1. New Tables
    - `memes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `media_url` (text)
      - `media_type` (text)
      - `created_at` (timestamptz)
      - `likes_count` (integer)
    - `comments`
      - `id` (uuid, primary key)
      - `meme_id` (uuid, foreign key)
      - `content` (text)
      - `created_at` (timestamptz)
    - `likes`
      - `id` (uuid, primary key)
      - `meme_id` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Storage
    - Create memes bucket for storing media files

  3. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS memes CASCADE;

-- Create tables
CREATE TABLE memes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at timestamptz DEFAULT now(),
  likes_count integer DEFAULT 0
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id uuid REFERENCES memes(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id uuid REFERENCES memes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to memes"
  ON memes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to memes"
  ON memes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to comments"
  ON comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to comments"
  ON comments FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to likes"
  ON likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to likes"
  ON likes FOR INSERT
  TO public
  WITH CHECK (true);

-- Create storage bucket
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('memes', 'memes', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies (with safety checks)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'memes');

  CREATE POLICY "Public Upload"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'memes');
END $$;