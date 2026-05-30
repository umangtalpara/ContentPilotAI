'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/workspaces');
    } catch (e: any) {
      setError(e.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-4 py-12">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            {/* Logo */}
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
              <span className="text-xl font-bold text-white tracking-wider">CP</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">ContentPilot AI</h2>
            <p className="text-sm text-slate-400 mt-1">Plan. Create. Schedule. Publish.</p>
          </div>

          <Card className="glass-panel border-white/5 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-gradient-premium text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>Enter your credentials to access your control panel</CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs md:text-sm font-medium mb-4 flex items-start gap-2"
                >
                  <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  id="email"
                  type="email"
                  label="Email Address"
                  placeholder="name@provenpeak.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
                
                <div className="flex flex-col gap-1">
                  <Input
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <div className="text-right">
                    <Link
                      href="/forgot-password"
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <Button variant="primary" type="submit" isLoading={isLoading} className="mt-2 w-full">
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-400 mt-6">
            New to ContentPilot?{' '}
            <Link
              href="/register"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline-offset-4 hover:underline transition-colors"
            >
              Create free account
            </Link>
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
