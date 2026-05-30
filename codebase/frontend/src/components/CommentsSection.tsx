'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Comment {
  _id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface CommentsSectionProps {
  postId: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];
function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export default function CommentsSection({ postId, workspaceId, isOpen, onClose }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    if (!postId || !workspaceId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/workspaces/${workspaceId}/posts/${postId}/comments`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [postId, workspaceId]);

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
    }
  }, [isOpen, postId, fetchComments]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/workspaces/${workspaceId}/posts/${postId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: content.trim() }),
        },
      );
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setContent('');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message ?? 'Failed to post comment');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 204) {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Sliding Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(420px, 100vw)',
          background: 'linear-gradient(160deg, #0f1117 0%, #161b28 100%)',
          borderLeft: '1px solid rgba(139,92,246,0.25)',
          boxShadow: '-12px 0 60px rgba(0,0,0,0.6)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(139,92,246,0.08)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💬</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>
                Post Comments
              </span>
              {comments.length > 0 && (
                <span style={{
                  background: 'rgba(139,92,246,0.3)',
                  color: '#a78bfa',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid rgba(139,92,246,0.4)',
                }}>
                  {comments.length}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Collaborative discussion thread
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            ×
          </button>
        </div>

        {/* Comments List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', paddingTop: 40 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: '#475569',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>💬</div>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                No comments yet. Start the conversation!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment._id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  position: 'relative',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: avatarColor(comment.authorName),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}>
                    {getInitials(comment.authorName)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        {comment.authorName}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#475569' }}>
                          {timeAgo(comment.createdAt)}
                        </span>
                        <button
                          onClick={() => handleDelete(comment._id)}
                          title="Delete comment"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: 4,
                            fontSize: 12,
                            opacity: 0.6,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Comment Input */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          {error && (
            <div style={{
              marginBottom: 8,
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: 12,
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment... (Shift+Enter for new line)"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              style={{
                resize: 'none',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#e2e8f0',
                fontSize: 13,
                lineHeight: 1.5,
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              style={{
                background: submitting || !content.trim()
                  ? 'rgba(139,92,246,0.3)'
                  : 'linear-gradient(135deg, #7c3aed, #6366f1)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {submitting ? '⏳ Posting...' : '✉️ Post Comment'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
