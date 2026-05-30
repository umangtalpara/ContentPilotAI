import React from 'react';
import { Dashboard } from '@/components/Dashboard';
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Dashboard />
    </div>
  );
}
