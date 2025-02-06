export interface Meme {
  id: string;
  title: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  likes_count: number;
}

export interface Comment {
  id: string;
  meme_id: string;
  content: string;
  created_at: string;
}