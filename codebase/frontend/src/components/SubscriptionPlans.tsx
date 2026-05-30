'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../utils/api';

interface PlanDetail {
  id: 'free' | 'pro' | 'agency';
  name: string;
  price: string;
  credits: number;
  description: string;
  badge?: string;
  features: string[];
  color: string;
  btnVariant: 'primary' | 'secondary' | 'outline';
}

const PLANS: PlanDetail[] = [
  {
    id: 'free',
    name: 'Free Starter',
    price: '$0',
    credits: 20,
    description: 'Perfect for content creators exploring social media automation tools.',
    features: [
      '1 Connected Social Integration',
      '20 AI Credits per Month',
      'Interactive Content Calendar Grid',
      'Global UI Notification System',
      'Standard Support Ticketing'
    ],
    color: 'border-slate-800 text-slate-400 bg-slate-900/10',
    btnVariant: 'outline'
  },
  {
    id: 'pro',
    name: 'Pro Professional',
    price: '$29',
    credits: 500,
    description: 'Excellent for growing brands and full-time digital creators.',
    badge: '★ POPULAR',
    features: [
      '3 Connected Social Integrations',
      '500 AI Credits per Month',
      'AI Instant Auto-Caption Generator',
      'AI Instant Hashtag Recommendation Engine',
      'CSV Bulk Campaign Upload Utility',
      'Priority Email Support'
    ],
    color: 'border-indigo-500/50 text-indigo-400 bg-indigo-950/20 shadow-[0_4px_30px_rgba(99,102,241,0.15)]',
    btnVariant: 'primary'
  },
  {
    id: 'agency',
    name: 'Enterprise Agency',
    price: '$99',
    credits: 5000,
    description: 'Custom tailored for professional marketing agencies and large teams.',
    badge: '💎 BEST VALUE',
    features: [
      'Unlimited Social integrations',
      '5,000 AI Credits per Month',
      'First Campaign Guided Wizard Integration',
      'Complete Collaboration & Audit Activity logs',
      'Performance Analytics KPI Dashboards',
      '24/7 Dedicated Premium Support Line'
    ],
    color: 'border-amber-500/50 text-amber-400 bg-amber-950/20 shadow-[0_4px_30px_rgba(245,158,11,0.15)]',
    btnVariant: 'secondary'
  }
];

export default function SubscriptionPlans() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: 'free' | 'pro' | 'agency') => {
    if (!user) {
      showToast('Please sign in to manage subscriptions.', 'error');
      return;
    }

    setLoadingPlan(planId);
    try {
      // Direct mock checkout webhook callback simulation in development
      await api.post('/billing/mock-webhook', {
        userId: user.id,
        plan: planId,
      });

      // Fetch refreshed user object to sync local React state
      await refreshUser();
      
      showToast(`Successfully switched to the ${planId.toUpperCase()} plan!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update subscription. Please try again.', 'error');
    } finally {
      setLoadingPlan(null);
    }
  };

  const activeTier = user?.subscriptionTier || 'free';

  return (
    <div className="flex flex-col gap-8">
      {/* Premium Informational Banner */}
      <div className="rounded-xl border border-white/5 bg-gradient-to-r from-slate-900/60 to-slate-900/20 backdrop-blur-md p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-lg font-bold text-white">Manage Subscription Plans</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Upgrade, downgrade, or scale your account at any time. Scale AI creation limits and connect additional social brand networks instantly.
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Subscription</span>
          <span className="text-xl font-bold text-gradient-premium uppercase mt-0.5">
            {activeTier} Plan
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => {
          const isActive = activeTier === plan.id;
          const isDowngrade =
            (activeTier === 'agency' && plan.id !== 'agency') ||
            (activeTier === 'pro' && plan.id === 'free');

          return (
            <Card
              key={plan.id}
              className={`flex flex-col relative min-h-[500px] border-2 transition-all duration-300 ${
                isActive ? plan.color : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/10'
              }`}
            >
              {plan.badge && (
                <div className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md ${
                  plan.id === 'agency' ? 'bg-amber-500 text-slate-950' : 'bg-indigo-500 text-white'
                }`}>
                  {plan.badge}
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1 min-h-[36px]">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-6 pt-2">
                {/* Price Display */}
                <div className="flex items-baseline gap-1 border-b border-white/5 pb-4">
                  <span className="text-4xl md:text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm font-semibold">/month</span>
                </div>

                {/* Credit balance stat snippet */}
                <div className="bg-slate-900/40 rounded-lg p-3 border border-white/5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-350">Monthly Allocation:</span>
                  <span className="text-sm font-bold text-cyan-400">{plan.credits.toLocaleString()} AI Credits</span>
                </div>

                {/* Features List */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Plan Features</span>
                  <ul className="flex flex-col gap-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                        <span className="text-emerald-400 text-sm leading-none mt-0.5">✓</span>
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-4 pb-6 px-6 border-t-0">
                <Button
                  variant={isActive ? 'ghost' : plan.btnVariant}
                  onClick={() => !isActive && handleUpgrade(plan.id)}
                  isLoading={loadingPlan === plan.id}
                  disabled={isActive}
                  className="w-full font-bold uppercase tracking-wider py-4 min-h-[48px]"
                >
                  {isActive
                    ? '⚡ Current Active'
                    : isDowngrade
                    ? 'Downgrade Plan'
                    : `Upgrade to ${plan.id}`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
