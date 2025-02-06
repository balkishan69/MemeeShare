import React, { useState, useEffect } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { MemeCard } from './components/MemeCard';
import type { Meme } from './types';

function App() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newMeme, setNewMeme] = useState({ title: '', media_url: '', media_type: 'image' as const });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [clearAllPassword, setClearAllPassword] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const ADMIN_PASSWORD = '367098';

  const loadMemes = async () => {
    const { data, error } = await supabase
      .from('memes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading memes:', error);
      toast.error('Failed to load memes');
      return;
    }
    
    if (data) {
      setMemes(data);
    }
  };

  useEffect(() => {
    loadMemes();
    
    // Subscribe to realtime updates for memes, likes, and comments
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memes'
        },
        () => loadMemes()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearAllMemes = async () => {
    if (clearAllPassword !== ADMIN_PASSWORD) {
      toast.error('Incorrect password');
      return;
    }

    setIsClearing(true);
    try {
      // First, get all memes that have Supabase storage URLs
      const { data: memesWithStorageUrls } = await supabase
        .from('memes')
        .select('media_url')
        .filter('media_url', 'ilike', '%.supabase.co%');

      // Delete files from storage
      if (memesWithStorageUrls && memesWithStorageUrls.length > 0) {
        const filesToDelete = memesWithStorageUrls
          .map(meme => {
            const mediaPath = meme.media_url.split('/').pop();
            return mediaPath ? `memes/${mediaPath}` : null;
          })
          .filter(Boolean) as string[];

        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('memes')
            .remove(filesToDelete);

          if (storageError) throw storageError;
        }
      }

      // Delete all records from the memes table
      const { error: dbError } = await supabase
        .from('memes')
        .delete()
        .gt('id', '00000000-0000-0000-0000-000000000000');

      if (dbError) throw dbError;

      toast.success('All memes have been cleared');
      setShowClearAllConfirm(false);
      setClearAllPassword('');
      await loadMemes();
    } catch (error) {
      console.error('Clear all error:', error);
      toast.error('Failed to clear all memes');
    } finally {
      setIsClearing(false);
    }
  };

  const uploadMedia = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `memes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('memes')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('memes')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeme.media_url && !selectedFile) {
      toast.error('Please provide a media file or URL');
      return;
    }

    setIsUploading(true);
    try {
      let mediaUrl = newMeme.media_url;
      let mediaType = newMeme.media_type;
      
      if (selectedFile) {
        mediaUrl = await uploadMedia(selectedFile);
        mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const { error } = await supabase.from('memes').insert([{
        title: newMeme.title || null, // Use null for empty titles
        media_url: mediaUrl,
        media_type: mediaType
      }]);

      if (error) throw error;

      setNewMeme({ title: '', media_url: '', media_type: 'image' });
      setSelectedFile(null);
      setShowUploadForm(false);
      toast.success('Meme uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload meme');
    }
    setIsUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
        return;
      }
      
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Only image and video files are allowed');
        return;
      }
      
      setSelectedFile(file);
      setNewMeme(prev => ({ 
        ...prev, 
        media_url: '',
        media_type: file.type.startsWith('video/') ? 'video' : 'image'
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">MemeeShare</h1>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearAllConfirm(true)}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 size={20} />
                Clear All
              </button>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ImagePlus size={20} />
                Share Meme
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {showUploadForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload New Meme</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title (Optional)</label>
                <input
                  type="text"
                  value={newMeme.title}
                  onChange={(e) => setNewMeme({ ...newMeme, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter meme title"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Upload Media</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500">
                  Max file size: {newMeme.media_type === 'video' ? '50MB' : '5MB'}
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Media URL</label>
                <input
                  type="url"
                  value={newMeme.media_url}
                  onChange={(e) => {
                    setNewMeme({ ...newMeme, media_url: e.target.value });
                    setSelectedFile(null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter media URL"
                  disabled={!!selectedFile}
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
              >
                {isUploading ? 'Uploading...' : 'Upload Meme'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-6">
          {memes.map((meme) => (
            <MemeCard
              key={meme.id}
              meme={meme}
              onLike={loadMemes}
              onDelete={loadMemes}
            />
          ))}
        </div>
      </main>

      {/* Clear All Confirmation Modal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Clear All Memes</h3>
            <p className="text-gray-600 mb-4">
              Please enter the admin password to clear all memes. This action cannot be undone.
            </p>
            <input
              type="password"
              value={clearAllPassword}
              onChange={(e) => setClearAllPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowClearAllConfirm(false);
                  setClearAllPassword('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                onClick={clearAllMemes}
                disabled={isClearing}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;