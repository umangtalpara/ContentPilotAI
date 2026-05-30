'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Button } from './ui/Button';

interface IntegrationRecord {
  id: string;
  platform: string;
  profileDetails?: {
    name: string;
    avatarUrl?: string;
    handle?: string;
  };
  expiresAt?: string;
  createdAt: string;
}

export const IntegrationsList: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.get<IntegrationRecord[]>(`/workspaces/${currentWorkspace._id}/integrations`);
      setIntegrations(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch integrations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [currentWorkspace]);

  const handleDisconnect = async (id: string) => {
    if (!currentWorkspace) return;
    setIsDeleting(id);
    try {
      await api.delete(`/workspaces/${currentWorkspace._id}/integrations/${id}`);
      setIntegrations(integrations.filter((i) => i.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect channel.');
    } finally {
      setIsDeleting(null);
    }
  };

  const getConnectUrl = (platform: 'linkedin' | 'twitter') => {
    if (!currentWorkspace) return '#';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    // Starts OAuth flow; provider returns back to callback endpoint.
    return `${baseUrl}/workspaces/${currentWorkspace._id}/integrations/${platform}/start`;
  };

  const channels = [
    {
      platform: 'linkedin',
      name: 'LinkedIn Community',
      icon: '💼',
      color: 'from-blue-600 to-sky-500',
      description: 'Publish professional campaigns, articles, and image galleries directly to your feed.',
    },
    {
      platform: 'twitter',
      name: 'X / Twitter Feed',
      icon: '🐦',
      color: 'from-slate-900 to-slate-800 border-slate-800',
      description: 'Post micro-updates, tweets, and media campaigns directly to your profile timeline.',
    },
  ];

  if (!currentWorkspace) {
    return (
      <div className="text-center p-6 text-slate-400">
        Please select a workspace to manage social integrations.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg md:text-xl font-bold tracking-tight text-white mb-1">Connected Social Channels</h3>
        <p className="text-sm text-slate-400">Link your workspace to external networks to enable scheduled publishing.</p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((chan) => {
            const conn = integrations.find((i) => i.platform === chan.platform);

            return (
              <div
                key={chan.platform}
                className="rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-md p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 shadow-lg group relative overflow-hidden"
              >
                {/* Decorative card glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{chan.icon}</span>
                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight">{chan.name}</h4>
                      {conn ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
                          ● Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-500 mt-0.5">
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed min-h-[40px]">
                    {chan.description}
                  </p>

                  {conn && conn.profileDetails && (
                    <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3 flex items-center space-x-3">
                      {conn.profileDetails.avatarUrl ? (
                        <img
                          src={conn.profileDetails.avatarUrl}
                          alt={conn.profileDetails.name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                          {conn.profileDetails.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-200 block truncate">
                          {conn.profileDetails.name}
                        </span>
                        <span className="text-xs text-slate-500 block truncate">
                          @{conn.profileDetails.handle || 'user'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 relative z-10">
                  {conn ? (
                    <Button
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={isDeleting === conn.id}
                      className="w-full bg-slate-900 border-slate-800 hover:border-red-500/30 hover:bg-red-950/20 hover:text-red-400 text-slate-400 font-semibold min-h-[40px] rounded-lg transition-all"
                    >
                      {isDeleting === conn.id ? 'Disconnecting...' : 'Disconnect Integration'}
                    </Button>
                  ) : (
                    <a
                      href={getConnectUrl(chan.platform as any)}
                      className="inline-flex w-full items-center justify-center py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold hover:bg-slate-850 hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.1)] transition-all cursor-pointer min-h-[44px]"
                    >
                      🔌 Connect Platform
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
