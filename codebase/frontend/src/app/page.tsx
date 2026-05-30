'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/workspaces');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Verifying session...
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600">
          <span className="text-xl font-bold tracking-wider text-white">CP</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">ContentPilot AI</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
          Plan, create, schedule, and auto-publish social content from one workspace.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-500 px-6 py-2.5 font-bold text-slate-950 transition hover:bg-cyan-400"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 px-6 py-2.5 font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
