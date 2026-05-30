'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../utils/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Reset token is missing. Please use the link from your reset request.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ message: string }>('/auth/reset-password', { token, password });
      setSuccess(response.message || 'Password reset successful.');
      setPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="glass-panel border-white/5 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-gradient-premium text-2xl font-bold">Set New Password</CardTitle>
            <CardDescription>Choose a secure password for your account.</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm text-emerald-400">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="new-password"
                type="password"
                label="New Password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <Input
                id="confirm-password"
                type="password"
                label="Confirm Password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />

              <Button variant="primary" type="submit" className="w-full mt-2" isLoading={loading}>
                Update Password
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Back to{' '}
              <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
          Loading reset page...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
