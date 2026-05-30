'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { AiAssistantDrawer } from './AiAssistantDrawer';

interface PostCreatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PostCreatorDialog: React.FC<PostCreatorDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentWorkspace } = useAuth();
  
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin']);
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleAddHashtag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const tag = hashtagInput.trim().replace('#', '');
      if (tag && !hashtags.includes(tag)) {
        setHashtags([...hashtags, tag]);
      }
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentWorkspace) return;

    const file = files[0];
    setIsUploading(true);
    setError(null);

    try {
      // 1. Get upload coordinates (presigned or local dev destination)
      const uploadCoords = await api.get<{ uploadUrl: string; downloadUrl: string; mode: string }>(
        `/workspaces/${currentWorkspace._id}/media/presigned?filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`
      );

      // 2. Perform the upload
      if (uploadCoords.mode === 'local') {
        const formData = new FormData();
        formData.append('file', file);
        
        // Call local server upload endpoint
        const uploadRes = await api.post<{ downloadUrl: string }>(
          `/workspaces/${currentWorkspace._id}/media/upload?filename=${pathExtract(uploadCoords.uploadUrl)}`,
          formData
        );
        setMediaUrls([...mediaUrls, uploadRes.downloadUrl]);
      } else {
        // Mock S3 direct upload
        await fetch(uploadCoords.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        setMediaUrls([...mediaUrls, uploadCoords.downloadUrl]);
      }
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const pathExtract = (url: string) => {
    try {
      const u = new URL(url);
      return u.searchParams.get('filename') || 'file';
    } catch {
      return 'file';
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentWorkspace) return;
    if (!title || !caption || !scheduleAt) {
      setError('Please fill in all required fields');
      return;
    }

    const scheduleDate = new Date(scheduleAt);
    if (scheduleDate <= new Date()) {
      setError('Schedule date must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/workspaces/${currentWorkspace._id}/posts`, {
        title,
        caption,
        scheduleAt: scheduleDate.toISOString(),
        platforms: selectedPlatforms,
        hashtags,
        mediaUrls,
      });

      // Reset form states
      setTitle('');
      setCaption('');
      setScheduleAt('');
      setHashtags([]);
      setMediaUrls([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create Social Post">
      {error && (
        <div className="bg-red-950/30 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-4">
        <Input
          id="post-title"
          label="Campaign Title"
          placeholder="e.g. Summer Launch Promo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          required
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="post-caption" className="text-sm font-medium text-slate-300">Caption / Content</label>
            <button
              type="button"
              onClick={() => setIsAiDrawerOpen(true)}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-950/40 hover:border-cyan-500/40 transition-all cursor-pointer min-h-[32px] font-sans"
            >
              <span>✨ AI Sidekick</span>
            </button>
          </div>
          <textarea
            id="post-caption"
            placeholder="Write your social post content here..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isSubmitting}
            rows={4}
            className="flex w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm md:text-base text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
            required
          />
        </div>

        {/* Target Platforms */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Target Social Networks</label>
          <div className="flex gap-3">
            {['linkedin', 'twitter'].map((platform) => {
              const selected = selectedPlatforms.includes(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg uppercase tracking-wider border transition-all cursor-pointer ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-md shadow-cyan-500/5'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {platform}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule DateTime */}
        <Input
          id="post-schedule"
          label="Publish Schedule Time"
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
          disabled={isSubmitting}
          required
        />

        {/* Hashtags adder */}
        <div className="flex flex-col gap-2">
          <label htmlFor="hashtag-input" className="text-sm font-medium text-slate-300">Hashtags</label>
          <input
            id="hashtag-input"
            type="text"
            placeholder="Press Enter or Space to add tags"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={handleAddHashtag}
            disabled={isSubmitting}
            className="flex h-12 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm md:text-base text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
          />
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900 border border-slate-800 text-slate-300"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeHashtag(tag)}
                    className="text-slate-500 hover:text-white cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Attachments Upload dropzone */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Media Attachments</label>
          
          <div className="relative border border-dashed border-slate-800 rounded-lg p-6 bg-slate-900/10 hover:bg-slate-900/30 transition-all flex flex-col items-center justify-center text-center">
            <input
              type="file"
              id="file-upload"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              disabled={isUploading || isSubmitting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <svg className="animate-spin h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs text-slate-400">Uploading asset...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs md:text-sm font-semibold text-slate-300">Click or drag images/videos to attach</span>
                <span className="text-[10px] text-slate-500">Max size: 50MB</span>
              </div>
            )}
          </div>

          {/* Media previews list */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-2">
              {mediaUrls.map((url, i) => (
                <div key={url} className="relative rounded-lg border border-slate-800 bg-slate-900/40 p-1 aspect-square overflow-hidden group">
                  <img
                    src={url}
                    alt="attachment preview"
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => {
                      // fallback for videos or documents
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Remove Button overlay */}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="primary" type="submit" isLoading={isSubmitting} className="w-full mt-2">
          Create Post & Schedule
        </Button>
      </form>

      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        onInject={(aiText) => setCaption(aiText)}
      />
    </Dialog>
  );
};
