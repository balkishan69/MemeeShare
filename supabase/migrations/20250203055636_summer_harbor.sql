/*
  # Add video support to memes table

  1. Changes
    - Add media_type column to memes table to distinguish between images and videos
    - Add check constraint to ensure valid media types
*/

-- Add media_type column
ALTER TABLE memes ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image'
  CHECK (media_type IN ('image', 'video'));

-- Rename image_url to media_url to be more generic
ALTER TABLE memes RENAME COLUMN image_url TO media_url;