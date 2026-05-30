'use client';

import { useState, useEffect, useCallback } from 'react';

interface ActivityItem {
  _id: string;
  workspaceId: string;
  userId?: string;
  actorName?: string;
  action: string;
  details?: string;
  createdAt: string;
}

const ACTION_META: Record<string, { icon: string; label: string; color: string }> = {
  post_created:     { icon: '✅', label: 'Post Created',     color: '#22c55e' },
  post_rescheduled: { icon: '📅', label: 'Post Rescheduled', color: '#f59e0b' },
  post_published:   { icon: '🚀', label: 'Post Published',   color: '#6366f1' },
  post_failed:      { icon: '❌', label: 'Post Failed',      color: '#ef4444' },
  post_deleted:     { icon: '🗑️', label: 'Post Deleted',     color: '#94a3b8' },
  member_invited:   { icon: '👥', label: 'Member Invited',   color: '#8b5cf6' },
  comment_added:    { icon: '💬', label: 'Comment Added',    color: '#06b6d4' },
  plan_upgraded:    { icon: '⭐', label: 'Plan Upgraded',    color: '#f59e0b' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ActivityFeedProps {
  workspaceId: string;
  limit?: number;
}

export default function ActivityFeed({ workspaceId, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActivities = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/workspaces/${workspaceId}/activities?limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setActivities(await res.json());
      } else {
        setError('Failed to load activity feed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, limit]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return (
    <div style={{
      background: 'linear-gradient(160deg, #0f1117 0%, #161b28 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 22px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(99,102,241,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Activity Feed</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Real-time workspace events</div>
          </div>
        </div>
        <button
          onClick={fetchActivities}
          title="Refresh"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 8,
            color: '#818cf8',
            cursor: 'pointer',
            padding: '5px 10px',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Feed */}
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: 13 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
            Loading activity feed...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
            <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }}>⚡</div>
            <p style={{ margin: 0, fontSize: 13 }}>No activity yet. Start creating content!</p>
          </div>
        ) : (
          activities.map((activity, idx) => {
            const meta = ACTION_META[activity.action] ?? { icon: '📌', label: activity.action, color: '#64748b' };
            return (
              <div
                key={activity._id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 22px',
                  borderBottom: idx < activities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
              >
                {/* Timeline dot */}
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: meta.color,
                  marginTop: 5,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${meta.color}55`,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14 }}>{meta.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>
                      {meta.label}
                    </span>
                    {activity.actorName && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        by <span style={{ color: '#94a3b8', fontWeight: 500 }}>{activity.actorName}</span>
                      </span>
                    )}
                  </div>
                  {activity.details && (
                    <p style={{
                      margin: '3px 0 0',
                      fontSize: 12,
                      color: '#64748b',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {activity.details}
                    </p>
                  )}
                </div>

                <span style={{ fontSize: 11, color: '#334155', flexShrink: 0, marginTop: 1 }}>
                  {timeAgo(activity.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
