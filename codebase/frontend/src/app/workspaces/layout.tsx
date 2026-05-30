'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export default function WorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout, currentWorkspace } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-400 text-sm font-medium">Verifying session context...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/10">
              <span className="text-sm font-bold text-white tracking-wider">CP</span>
            </div>
            <div>
              <h1 className="text-md font-bold text-white tracking-tight leading-none">ContentPilot AI</h1>
              {currentWorkspace && (
                <span className="text-xs text-cyan-400 font-medium">{currentWorkspace.name}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-white">{user.name}</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
            
            {/* User Avatar */}
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <Button
              variant="outline"
              onClick={logout}
              className="min-h-[40px] h-10 px-4 py-2 text-xs md:text-sm font-medium border-slate-800 hover:border-red-500/30 hover:bg-red-950/20 hover:text-red-400"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 z-10">
        {children}
      </main>
    </div>
  );
}
