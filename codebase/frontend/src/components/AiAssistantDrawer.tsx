'use client';

import React, { useState } from 'react';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (caption: string) => void;
}

const TONES = [
  { value: 'professional', label: '💼 Professional', description: 'Polished, authoritative, industry-aligned' },
  { value: 'casual', label: '☕ Casual', description: 'Friendly, personal, highly conversational' },
  { value: 'educational', label: '💡 Educational', description: 'Informative, structured, tutorial-style' },
  { value: 'funny', label: '🎭 Funny', description: 'Witty, relatable, meme-inspired humor' },
  { value: 'promotional', label: '🚀 Promotional', description: 'Compelling, benefit-oriented CTA focus' },
];

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'twitter', label: 'X / Twitter', icon: '🐦' },
  { value: 'facebook', label: 'Facebook', icon: '👥' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onInject,
}) => {
  const { user, currentWorkspace, refreshUser } = useAuth();
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('linkedin');
  const [industry, setIndustry] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const credits = user?.aiCreditsRemaining ?? 0;
  const isOutOfCredits = credits <= 0;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMsg('Please specify a topic or talking points.');
      return;
    }
    if (isOutOfCredits) {
      setErrorMsg('You have 0 AI credits remaining. Please upgrade your plan.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setGeneratedCaption('');
    setCopied(false);

    try {
      const response = await api.post<{ caption: string }>(
        `/workspaces/${currentWorkspace?._id}/ai/generate-caption`,
        {
          topic,
          tone,
          platform,
        }
      );
      setGeneratedCaption(response.caption);
      await refreshUser(); // Update credit count dynamically!
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInject = () => {
    if (generatedCaption) {
      onInject(generatedCaption);
      onClose();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="✨ AI Sidekick Assistant" size="lg">
      <div className="space-y-6 pb-12">
        {/* Credit Balance Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold font-mono">Resource Balance</span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-cyan-400 font-sans">{credits}</span>
              <span className="text-sm text-slate-400">/ 20 AI Credits remaining</span>
            </div>
          </div>
          <div className="h-2 w-24 rounded-full bg-slate-800 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 ${isOutOfCredits ? 'bg-red-500' : 'bg-cyan-400'}`}
              style={{ width: `${Math.min(100, (credits / 20) * 100)}%` }}
            />
          </div>
        </div>

        {isOutOfCredits && (
          <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-400 flex items-start space-x-2">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You have consumed all your free credits. Upgrade your account or check back next month to replenish your AI balance.</span>
          </div>
        )}

        {/* Input Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              What is your post about? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Launching a new background processing queue engine in ContentPilot for bulletproof reliability..."
              rows={4}
              disabled={isGenerating || isOutOfCredits}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-sans"
            />
          </div>

          {/* Platform Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Target Network</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PLATFORMS.map((plat) => (
                <button
                  key={plat.value}
                  type="button"
                  onClick={() => setPlatform(plat.value)}
                  disabled={isGenerating || isOutOfCredits}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px] ${
                    platform === plat.value
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                      : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <span>{plat.icon}</span>
                  <span>{plat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Tone of Voice</label>
            <div className="space-y-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  disabled={isGenerating || isOutOfCredits}
                  className={`w-full text-left p-3 rounded-lg border flex items-start space-x-3 transition-all cursor-pointer min-h-[48px] ${
                    tone === t.value
                      ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                      : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:bg-slate-900/40 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-lg">{t.label.split(' ')[0]}</span>
                  <div className="flex-1">
                    <span className="font-semibold block text-sm">{t.label.split(' ').slice(1).join(' ')}</span>
                    <span className="text-xs text-slate-500 block mt-0.5">{t.description}</span>
                  </div>
                  {tone === t.value && (
                    <span className="text-cyan-400 mt-1 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-500/10 bg-red-950/10 p-3 text-sm text-red-400 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Generate Action Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim() || isOutOfCredits}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold min-h-[48px] rounded-lg shadow-lg flex items-center justify-center space-x-2 transition-all"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating magic...</span>
              </>
            ) : (
              <>
                <span>✨ Generate Custom Post</span>
              </>
            )}
          </Button>
        </div>

        {/* Results Visual Display */}
        {generatedCaption && (
          <div className="border-t border-white/5 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-300">Generated Draft Output</h4>
              <span className="text-xs text-slate-500 font-mono">
                {generatedCaption.length} characters
              </span>
            </div>
            
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 relative min-h-[140px] text-slate-200 text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
              {generatedCaption}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-900 hover:border-slate-700 transition-all font-semibold flex items-center justify-center space-x-2 cursor-pointer min-h-[48px]"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleInject}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[48px]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Inject into Post</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
