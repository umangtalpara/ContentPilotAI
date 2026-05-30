'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Placeholder flow until backend reset endpoints are implemented.
    setSubmitted(true);
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
            {submitted ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm text-emerald-400">
                If an account exists for <span className="font-semibold">{email}</span>, reset instructions have been sent.
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
                <Button variant="primary" type="submit" className="w-full mt-2">
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
