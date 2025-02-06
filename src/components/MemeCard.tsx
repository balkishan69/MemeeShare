import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Meme, Comment } from '../types';
import toast from 'react-hot-toast';

interface MemeCardProps {
  meme: Meme;
  onLike: () => void;
  onDelete: () => void;
}

export function MemeCard({ meme, onLike, onDelete }: MemeCardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const ADMIN_PASSWORD = '367098';

  const loadComments = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('meme_id', meme.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setComments(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (showComments) {
      loadComments();
    }

    // Subscribe to comments for this meme
    const subscription = supabase
      .channel(`comments-${meme.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `meme_id=eq.${meme.id}`
        },
        () => {
          if (showComments) {
            loadComments();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [meme.id, showComments]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await supabase.from('likes').insert([{ meme_id: meme.id }]);
      await supabase.from('memes')
        .update({ likes_count: meme.likes_count + 1 })
        .eq('id', meme.id);
      onLike();
      toast.success('Meme liked!');
    } catch (error) {
      toast.error('Failed to like meme');
    }
    setIsLiking(false);
  };

  const handleDelete = async () => {
    if (deletePassword !== ADMIN_PASSWORD) {
      toast.error('Incorrect password');
      return;
    }

    setIsDeleting(true);
    try {
      // Delete the media from storage if it's a uploaded file
      if (meme.media_url.includes('supabase.co')) {
        const mediaPath = meme.media_url.split('/').pop();
        if (mediaPath) {
          const { error: storageError } = await supabase.storage
            .from('memes')
            .remove([`memes/${mediaPath}`]);
          
          if (storageError) throw storageError;
        }
      }

      // Delete the meme from the database
      const { error: dbError } = await supabase
        .from('memes')
        .delete()
        .eq('id', meme.id);

      if (dbError) throw dbError;
      
      toast.success('Meme deleted successfully');
      onDelete();
      setShowDeleteConfirm(false);
      setDeletePassword('');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete meme');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await supabase.from('comments').insert([{
        meme_id: meme.id,
        content: newComment.trim()
      }]);
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {meme.title && (
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{meme.title}</h2>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-gray-500 hover:text-red-500 transition-colors"
            title="Delete meme"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}
      {!meme.title && (
        <div className="p-4 flex justify-end">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-gray-500 hover:text-red-500 transition-colors"
            title="Delete meme"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}

      <div className="relative w-full" style={{ maxHeight: '80vh' }}>
        {meme.media_type === 'video' ? (
          <div className="aspect-video">
            <video 
              src={meme.media_url}
              controls
              className="w-full h-full object-contain bg-black"
            />
          </div>
        ) : (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <img 
              src={meme.media_url} 
              alt={meme.title || ''}
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-6">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Heart className={meme.likes_count > 0 ? 'fill-red-500 text-red-500' : ''} size={20} />
            <span>{meme.likes_count}</span>
          </button>
          <button
            onClick={handleToggleComments}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-500 transition-colors"
          >
            <MessageCircle size={20} />
            <span>{comments.length}</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copied to clipboard!');
            }}
            className="flex items-center gap-1 text-gray-600 hover:text-green-500 transition-colors"
          >
            <Share2 size={20} />
          </button>
        </div>

        {showComments && (
          <div className="mt-4">
            <form onSubmit={handleAddComment} className="mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
            
            {isLoading ? (
              <div className="text-center py-4">Loading comments...</div>
            ) : (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-800">{comment.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal with Password */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Meme</h3>
            <p className="text-gray-600 mb-4">
              Please enter the admin password to delete this meme. This action cannot be undone.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}