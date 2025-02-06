/*
  # Make meme title optional

  1. Changes
    - Modify `memes` table to make title column optional
*/

ALTER TABLE memes ALTER COLUMN title DROP NOT NULL;