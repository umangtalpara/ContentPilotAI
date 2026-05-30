'use client';

import React, { useEffect, useState } from 'react';

// Mock types – replace with real API types when available
interface Analytics {
  aiCredits: {
    remaining: number;
    maxCredits: number;
    subscriptionTier: string;
  };
  workspaceCount: number;
  postCount: number;
  recentPosts: Array<{ id: string; title: string; createdAt: string }>;
}

const mockAnalytics: Analytics = {
  aiCredits: { remaining: 120, maxCredits: 500, subscriptionTier: 'pro' },
  workspaceCount: 3,
  postCount: 27,
  recentPosts: [
    { id: '1', title: 'Launch Announcement', createdAt: '2024-10-12' },
    { id: '2', title: 'AI Feature Update', createdAt: '2024-10-09' },
    { id: '3', title: 'Collaboration Tips', createdAt: '2024-10-05' },
  ],
};

export const Dashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // In a real app replace this with a fetch to the backend API.
  // For now we use the mock data to showcase the UI.
  useEffect(() => {
    // Simulate async fetch
    const timer = setTimeout(() => setAnalytics(mockAnalytics), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!analytics) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400">Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-8 p-6">
      {/* Greeting */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Welcome back, <span className="text-indigo-600 dark:text-indigo-400">User</span>!
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300">AI Credits</h2>
          <p className="mt-2 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            {analytics.aiCredits.remaining} / {analytics.aiCredits.maxCredits}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{analytics.aiCredits.subscriptionTier} plan</p>
        </div>
        <div className="rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300">Workspaces</h2>
          <p className="mt-2 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            {analytics.workspaceCount}
          </p>
        </div>
        <div className="rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300">Posts</h2>
          <p className="mt-2 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            {analytics.postCount}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Recent Posts</h2>
        <ul className="space-y-3">
          {analytics.recentPosts.map((post) => (
            <li
              key={post.id}
              className="rounded-lg bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm p-4 shadow"
            >
              <p className="font-medium text-gray-800 dark:text-gray-100">{post.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{post.createdAt}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
