/*
  # Create tables for meme sharing website

  1. New Tables
    - `memes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `likes_count` (integer)
    - `comments`
      - `id` (uuid, primary key)
      - `meme_id` (uuid, foreign key)
      - `content` (text)
      - `created_at` (timestamp)
    - `likes`
      - `id` (uuid, primary key)
      - `meme_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

CREATE TABLE IF NOT EXISTS memes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  likes_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id uuid REFERENCES memes(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS likes (
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