'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
  totalPosts: number;
  statusCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  recentActivity: {
    postsCreatedLast30Days: number;
    postsPublishedLast30Days: number;
  };
  integrations: {
    total: number;
    platforms: Array<{ platform: string; name: string; handle?: string }>;
  };
  aiCredits: {
    remaining: number;
    maxCredits: number;
    subscriptionTier: string;
  };
}

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: '💼',
  twitter: '🐦',
  instagram: '📸',
  facebook: '📘',
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free:   { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
  pro:    { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8', border: 'rgba(99,102,241,0.4)'  },
  agency: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.4)'  },
};

function CircleProgress({ value, max, label, sublabel, color }: {
  value: number; max: number; label: string; sublabel: string; color: string;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
            {value}
          </span>
          <span style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>/ {max}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{sublabel}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color }: {
  icon: string; label: string; value: string | number; subValue?: string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '18px 20px',
      borderLeft: `3px solid ${color}`,
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default',
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
      {subValue && (
        <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 500 }}>{subValue}</div>
      )}
    </div>
  );
}

interface AnalyticsDashboardProps {
  workspaceId: string;
}

export default function AnalyticsDashboard({ workspaceId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/workspaces/${workspaceId}/analytics`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setData(await res.json());
      } else {
        setError('Failed to load analytics');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 14 }}>Crunching your data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: '#ef4444' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14 }}>{error || 'No data available'}</div>
        <button onClick={fetchAnalytics} style={{
          marginTop: 16, padding: '8px 20px', background: 'rgba(99,102,241,0.2)',
          border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, color: '#818cf8',
          cursor: 'pointer', fontSize: 13,
        }}>
          Retry
        </button>
      </div>
    );
  }

  const tierStyle = TIER_COLORS[data.aiCredits.subscriptionTier] ?? TIER_COLORS.free;
  const publishRate = data.statusCounts.published > 0
    ? Math.round((data.statusCounts.published / data.totalPosts) * 100)
    : 0;

  const platformEntries = Object.entries(data.platformCounts).sort(([, a], [, b]) => b - a);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Subscription Tier Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: tierStyle.bg,
        border: `1px solid ${tierStyle.border}`,
        borderRadius: 14,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>
            {data.aiCredits.subscriptionTier === 'agency' ? '🏢' : data.aiCredits.subscriptionTier === 'pro' ? '⭐' : '🆓'}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: tierStyle.text, textTransform: 'uppercase', letterSpacing: 1 }}>
              {data.aiCredits.subscriptionTier} Plan
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {data.aiCredits.remaining} / {data.aiCredits.maxCredits} AI credits remaining
            </div>
          </div>
        </div>
        {/* Credits progress bar */}
        <div style={{ flex: 1, maxWidth: 220 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((data.aiCredits.remaining / data.aiCredits.maxCredits) * 100, 100)}%`,
              background: tierStyle.text,
              borderRadius: 999,
              transition: 'width 0.8s ease',
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
            {Math.round((data.aiCredits.remaining / data.aiCredits.maxCredits) * 100)}% remaining
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <StatCard icon="📝" label="Total Posts" value={data.totalPosts} color="#6366f1" />
        <StatCard icon="🚀" label="Published" value={data.statusCounts.published ?? 0}
          subValue={`${publishRate}% success rate`} color="#22c55e" />
        <StatCard icon="📅" label="Scheduled" value={data.statusCounts.scheduled ?? 0}
          subValue="Queued for publishing" color="#f59e0b" />
        <StatCard icon="🔗" label="Connected" value={data.integrations.total}
          subValue="Social networks" color="#8b5cf6" />
        <StatCard icon="⚡" label="Created (30d)" value={data.recentActivity.postsCreatedLast30Days}
          subValue="Recent activity" color="#06b6d4" />
      </div>

      {/* Circular Progress Indicators */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '24px',
      }}>
        <div style={{ marginBottom: 20, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
          📊 Post Status Distribution
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 24,
        }}>
          <CircleProgress
            value={data.statusCounts.published ?? 0}
            max={data.totalPosts || 1}
            label="Published" sublabel="Success" color="#22c55e"
          />
          <CircleProgress
            value={data.statusCounts.scheduled ?? 0}
            max={data.totalPosts || 1}
            label="Scheduled" sublabel="Queued" color="#f59e0b"
          />
          <CircleProgress
            value={data.statusCounts.draft ?? 0}
            max={data.totalPosts || 1}
            label="Drafts" sublabel="In progress" color="#6366f1"
          />
          <CircleProgress
            value={data.statusCounts.failed ?? 0}
            max={data.totalPosts || 1}
            label="Failed" sublabel="Needs review" color="#ef4444"
          />
        </div>
      </div>

      {/* Platform Breakdown */}
      {platformEntries.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '24px',
        }}>
          <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
            🌐 Platform Distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {platformEntries.map(([platform, count]) => {
              const pct = Math.round((count / data.totalPosts) * 100);
              return (
                <div key={platform}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {PLATFORM_ICONS[platform] ?? '🌐'}
                      <span style={{ textTransform: 'capitalize' }}>{platform}</span>
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{count} posts ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: platform === 'linkedin' ? '#0077b5'
                        : platform === 'twitter' ? '#1da1f2'
                        : platform === 'instagram' ? '#e1306c'
                        : '#6366f1',
                      borderRadius: 999,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected Integrations */}
      {data.integrations.platforms.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '20px 24px',
        }}>
          <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
            🔗 Connected Social Accounts
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {data.integrations.platforms.map((intg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: 16 }}>{PLATFORM_ICONS[intg.platform] ?? '🌐'}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{intg.name}</div>
                  {intg.handle && (
                    <div style={{ fontSize: 10, color: '#64748b' }}>@{intg.handle}</div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, marginLeft: 4 }}>● LIVE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={fetchAnalytics}
        style={{
          alignSelf: 'flex-start',
          padding: '9px 18px',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 10,
          color: '#818cf8',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        ↻ Refresh Analytics
      </button>
    </div>
  );
}
