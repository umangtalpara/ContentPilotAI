'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CalendarGrid } from '../../components/CalendarGrid';
import { PostCreatorDialog } from '../../components/PostCreatorDialog';
import { IntegrationsList } from '../../components/IntegrationsList';
import { BulkUploadDialog } from '../../components/BulkUploadDialog';
import CommentsSection from '../../components/CommentsSection';
import ActivityFeed from '../../components/ActivityFeed';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import FirstCampaignWizard from '../../components/FirstCampaignWizard';
import SubscriptionPlans from '../../components/SubscriptionPlans';
import { useToast } from '../../context/ToastContext';

export default function WorkspacesPage() {
  const { showToast } = useToast();
  const {
    user,
    workspaces,
    currentWorkspace,
    createWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
  } = useAuth();

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  
  const [createError, setCreateError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Calendar Posts states
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [integrationCount, setIntegrationCount] = useState(0);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'integrations' | 'analytics' | 'billing'>('calendar');
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Comments drawer state
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const fetchWorkspacePosts = async () => {
    if (!currentWorkspace) return;
    setPostsLoading(true);
    try {
      const data = await api.get<any[]>(`/workspaces/${currentWorkspace._id}/posts`);
      setPosts(data);
    } catch (e) {
      console.error('Failed to load workspace posts:', e);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchWorkspaceIntegrations = async () => {
    if (!currentWorkspace) return;
    try {
      const data = await api.get<any[]>(`/workspaces/${currentWorkspace._id}/integrations`);
      setIntegrationCount(data.length);
    } catch {
      setIntegrationCount(0);
    }
  };

  useEffect(() => {
    fetchWorkspacePosts();
    fetchWorkspaceIntegrations();
  }, [currentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const key = `cp_onboarding_hidden_${currentWorkspace._id}`;
    const hidden = localStorage.getItem(key) === '1';
    setShowOnboarding(!hidden);
  }, [currentWorkspace]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      await createWorkspace(newWorkspaceName);
      setNewWorkspaceName('');
      showToast('Workspace created successfully.', 'success');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create workspace');
      showToast(err.message || 'Failed to create workspace.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    if (!currentWorkspace || !inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const res = await api.post<{ tempPassword?: string }>(`/workspaces/${currentWorkspace._id}/invite`, {
        email: inviteEmail,
        role: inviteRole,
        name: inviteName.trim() || undefined,
      });
      
      const isNewUser = !!res?.tempPassword;
      const successMsg = isNewUser 
        ? `Successfully created account for ${inviteEmail}! Temporary Password: ${res.tempPassword}`
        : `Successfully invited ${inviteEmail}!`;
        
      setInviteSuccess(successMsg);
      setInviteEmail('');
      setInviteName('');
      await refreshWorkspaces();
      showToast(isNewUser ? 'User created & added to team!' : 'Member invited successfully.', 'success');
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite user');
      showToast(err.message || 'Failed to invite user.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const markOnboardingHidden = () => {
    if (!currentWorkspace) return;
    localStorage.setItem(`cp_onboarding_hidden_${currentWorkspace._id}`, '1');
    setShowOnboarding(false);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-4 gap-8"
    >
      {/* LEFT COLUMN: Workspace List & Creation (Span 1) */}
      <div className="lg:col-span-1 flex flex-col gap-8">
        {/* Workspace List Card */}
        <motion.div variants={cardVariants}>
          <Card className="glass-panel border-white/5 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-gradient-premium">Workspaces</CardTitle>
              <CardDescription>Select active workspace context</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {workspaces.map((ws) => {
                const isActive = currentWorkspace?._id === ws._id;
                return (
                  <button
                    key={ws._id}
                    onClick={() => setCurrentWorkspace(ws)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all duration-300 min-h-[56px] cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border-cyan-500/50 shadow-md shadow-cyan-500/5 text-white'
                        : 'bg-slate-900/20 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm md:text-base">{ws.name}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{ws.members.length} members</span>
                    </div>
                    {isActive && (
                      <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Create Workspace Card */}
        <motion.div variants={cardVariants}>
          <Card className="glass-panel border-white/5 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-gradient-premium text-md md:text-xl">New Workspace</CardTitle>
              <CardDescription>Launch another brand account</CardDescription>
            </CardHeader>
            <CardContent>
              {createError && (
                <div className="bg-red-950/30 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
                <Input
                  id="new-workspace"
                  label="Workspace Name"
                  placeholder="e.g. Acme Marketing"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  disabled={isCreating}
                  required
                />
                <Button variant="outline" type="submit" isLoading={isCreating} className="w-full">
                  Create Workspace
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: Interactive Calendar & Team details (Span 3) */}
      <div className="lg:col-span-3 flex flex-col gap-8">
        {currentWorkspace ? (
          <>
            {/* Header with trigger button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest leading-none">Dashboard</span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1 leading-none flex items-center gap-3">
                  {currentWorkspace.name} Control Panel
                  {user && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border select-none ${
                      user.subscriptionTier === 'agency'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : user.subscriptionTier === 'pro'
                        ? 'bg-indigo-500/10 text-indigo-450 border-indigo-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    }`}>
                      {user.subscriptionTier === 'agency' ? '🏢 Agency' : user.subscriptionTier === 'pro' ? '⭐ Pro' : '🆓 Free'}
                    </span>
                  )}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsWizardOpen(true)}
                  className="min-h-[44px] min-w-[120px] font-semibold border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-200 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  First Campaign Wizard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="min-h-[44px] min-w-[120px] font-semibold border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-350 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  📂 Bulk Upload
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setIsPostDialogOpen(true)}
                  className="shadow-[0_4px_20px_rgba(6,182,212,0.25)] min-h-[44px] min-w-[140px] font-bold cursor-pointer"
                >
                  + Create Post
                </Button>
              </div>
            </div>

            {showOnboarding && (
              <motion.div variants={cardVariants}>
                <Card className="glass-panel border-white/5 shadow-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gradient-premium text-lg">Quick Start Checklist</CardTitle>
                    <CardDescription>Complete these to publish your first social post.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className={`rounded-lg border p-3 ${integrationCount > 0 ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/30'}`}>
                        <div className="text-xs font-bold uppercase tracking-wide">1. Connect Platform</div>
                        <div className="text-[11px] text-slate-400 mt-1">{integrationCount > 0 ? 'Completed' : 'Open Social Connections tab'}</div>
                      </div>
                      <div className={`rounded-lg border p-3 ${posts.length > 0 ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/30'}`}>
                        <div className="text-xs font-bold uppercase tracking-wide">2. Create First Post</div>
                        <div className="text-[11px] text-slate-400 mt-1">{posts.length > 0 ? 'Completed' : 'Use Create Post button'}</div>
                      </div>
                      <div className={`rounded-lg border p-3 ${posts.some((p) => p.status === 'scheduled' || p.status === 'published') ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/30'}`}>
                        <div className="text-xs font-bold uppercase tracking-wide">3. Schedule and Publish</div>
                        <div className="text-[11px] text-slate-400 mt-1">{posts.some((p) => p.status === 'scheduled' || p.status === 'published') ? 'Completed' : 'Pick time and schedule'}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={markOnboardingHidden}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Dismiss checklist
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Sub-Tab Navigation Bar */}
            <div className="flex border-b border-white/5 pb-1 gap-6">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'border-cyan-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📅 Content Calendar
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'integrations'
                    ? 'border-cyan-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🔌 Social Connections
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'border-violet-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 Performance Analytics
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'billing'
                    ? 'border-amber-550 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                💎 Subscription & Plans
              </button>
            </div>

            {/* Central Content Panel switcher */}
            {activeTab === 'calendar' ? (
              <>
                <motion.div variants={cardVariants}>
                  <Card className="glass-panel border-white/5 shadow-2xl p-6">
                    {postsLoading ? (
                      <div className="flex flex-col items-center justify-center p-12 gap-4">
                        <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-xs text-slate-400">Loading scheduled campaigns...</span>
                      </div>
                    ) : (
                      <div>
                        <CalendarGrid posts={posts} onPostUpdate={fetchWorkspacePosts} />
                        {/* Comments trigger buttons per post */}
                        {posts.length > 0 && (
                          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {posts.slice(0, 8).map((post) => (
                              <button
                                key={post._id}
                                onClick={() => {
                                  setCommentsPostId(post._id);
                                  setIsCommentsOpen(true);
                                }}
                                style={{
                                  padding: '5px 12px',
                                  background: 'rgba(139,92,246,0.1)',
                                  border: '1px solid rgba(139,92,246,0.25)',
                                  borderRadius: 8,
                                  color: '#a78bfa',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                💬 {post.title?.slice(0, 20)}{post.title?.length > 20 ? '...' : ''}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>

                {/* Team Directory and Invitations */}
                <motion.div variants={cardVariants}>
                  <Card className="glass-panel border-white/5 shadow-2xl">
                    <CardHeader className="border-b border-white/5 pb-4">
                      <CardTitle className="text-gradient-premium">Workspace Settings & Directory</CardTitle>
                      <CardDescription>Manage active members, roles, and send invitations</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Member Directory */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Active Members</h4>
                          <div className="flex flex-col gap-4">
                            {currentWorkspace.members.map((member: any) => {
                              const displayUser = member.userId;
                              if (!displayUser) return null;
                              return (
                                <div key={member.userId._id || member.userId} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-white/5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-cyan-400 text-xs">
                                      {displayUser.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-white leading-none">{displayUser.name}</span>
                                      <span className="text-xs text-slate-400 mt-1">{displayUser.email}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-cyan-950/50 text-cyan-400 border border-cyan-500/20">
                                    {member.role}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Invite Member */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Invite Team Member</h4>
                          
                          {inviteError && (
                            <div className="bg-red-950/30 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                              {inviteError}
                            </div>
                          )}
                          {inviteSuccess && (
                            <div className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-lg mb-4 animate-bounce">
                              {inviteSuccess}
                            </div>
                          )}

                          <form onSubmit={handleInviteMember} className="flex flex-col gap-4">
                            <Input
                              id="invite-name"
                              label="Colleague's Full Name"
                              placeholder="e.g. Sarah Connor (Optional)"
                              value={inviteName}
                              onChange={(e) => setInviteName(e.target.value)}
                              disabled={isInviting}
                            />

                            <Input
                              id="invite-email"
                              label="Colleague's Email"
                              placeholder="coworker@provenpeak.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              disabled={isInviting}
                              required
                            />

                            <div className="flex flex-col gap-2">
                              <label htmlFor="invite-role" className="text-sm font-medium text-slate-300">Role Authority</label>
                              <select
                                id="invite-role"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="flex h-12 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm md:text-base text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              >
                                <option value="editor">Editor (Can create & schedule posts)</option>
                                <option value="viewer">Viewer (Can comment & review calendar)</option>
                              </select>
                            </div>

                            <Button variant="primary" type="submit" isLoading={isInviting} className="w-full mt-2">
                              Send Invite
                            </Button>
                          </form>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            ) : activeTab === 'integrations' ? (
              <motion.div variants={cardVariants}>
                <Card className="glass-panel border-white/5 shadow-2xl p-6 md:p-8">
                  <IntegrationsList />
                </Card>
              </motion.div>
            ) : activeTab === 'analytics' ? (
              /* Analytics Tab */
              <motion.div variants={cardVariants}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                  {/* Analytics Dashboard */}
                  <div style={{
                    background: 'linear-gradient(160deg, #0f1117 0%, #161b28 100%)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    borderRadius: 20,
                    padding: '24px',
                  }}>
                    <div style={{
                      marginBottom: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      paddingBottom: 16,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ fontSize: 22 }}>📊</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: '#e2e8f0' }}>Performance Analytics</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Real-time workspace metrics — refreshes automatically
                        </div>
                      </div>
                    </div>
                    <AnalyticsDashboard workspaceId={currentWorkspace._id} />
                  </div>

                  {/* Activity Feed */}
                  <ActivityFeed workspaceId={currentWorkspace._id} limit={30} />
                </div>
              </motion.div>
            ) : (
              /* Billing/Subscription Tab */
              <motion.div variants={cardVariants}>
                <SubscriptionPlans />
              </motion.div>
            )}

            {/* Post Creator Popup Dialog Modal */}
            <PostCreatorDialog
              isOpen={isPostDialogOpen}
              onClose={() => setIsPostDialogOpen(false)}
              onSuccess={fetchWorkspacePosts}
            />

            {/* CSV Bulk Upload Dialog Modal */}
            <BulkUploadDialog
              isOpen={isBulkUploadOpen}
              onClose={() => setIsBulkUploadOpen(false)}
              onSuccess={fetchWorkspacePosts}
            />

            {/* Comments Sliding Drawer */}
            <CommentsSection
              postId={commentsPostId ?? ''}
              workspaceId={currentWorkspace._id}
              isOpen={isCommentsOpen}
              onClose={() => setIsCommentsOpen(false)}
            />

            <FirstCampaignWizard
              isOpen={isWizardOpen}
              onClose={() => setIsWizardOpen(false)}
              onGoToIntegrations={() => {
                setActiveTab('integrations');
                setIsWizardOpen(false);
              }}
              onOpenPostCreator={() => {
                setIsPostDialogOpen(true);
                setIsWizardOpen(false);
              }}
              integrationConnected={integrationCount > 0}
              hasAnyPost={posts.length > 0}
              hasScheduledOrPublished={posts.some((p) => p.status === 'scheduled' || p.status === 'published')}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 backdrop-blur-md">
            <svg className="w-12 h-12 text-slate-500 mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-bold text-white">No active workspace</h3>
            <p className="text-sm text-slate-400 mt-2">Create a workspace from the left pane to get started!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
