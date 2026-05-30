'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../utils/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;

    setLoading(true);
    try {
      const response = await api.post<{ message: string; resetToken?: string }>('/auth/forgot-password', { email });
      setSubmitted(true);
      if (response.resetToken) {
        setDevResetToken(response.resetToken);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="glass-panel border-white/5 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-gradient-premium text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>Enter your account email to receive reset instructions.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {submitted ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm text-emerald-400">
                  If an account exists for <span className="font-semibold">{email}</span>, reset instructions have been sent.
                </div>
                {devResetToken && (
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs text-cyan-300">
                    <div className="font-semibold">Development token generated.</div>
                    <div className="mt-1 break-all font-mono">{devResetToken}</div>
                    <button
                      type="button"
                      onClick={() => router.push(`/reset-password?token=${encodeURIComponent(devResetToken)}`)}
                      className="mt-3 inline-flex min-h-[36px] items-center rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Continue to Reset Password
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  id="forgot-email"
                  type="email"
                  label="Email Address"
                  placeholder="name@provenpeak.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button variant="primary" type="submit" className="w-full mt-2" isLoading={loading}>
                  Send Reset Link
                </Button>
              </form>
            )}

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
