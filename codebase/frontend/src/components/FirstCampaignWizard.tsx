'use client';

import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

interface FirstCampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToIntegrations: () => void;
  onOpenPostCreator: () => void;
  integrationConnected: boolean;
  hasAnyPost: boolean;
  hasScheduledOrPublished: boolean;
}

export default function FirstCampaignWizard({
  isOpen,
  onClose,
  onGoToIntegrations,
  onOpenPostCreator,
  integrationConnected,
  hasAnyPost,
  hasScheduledOrPublished,
}: FirstCampaignWizardProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="First Campaign Wizard">
      <div className="space-y-4 pb-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
          <div className="text-sm font-semibold">Step 1: Connect a social channel</div>
          <div className="text-xs text-slate-400 mt-1">
            {integrationConnected ? 'Completed' : 'Connect LinkedIn or X in Social Connections.'}
          </div>
          {!integrationConnected && (
            <Button className="mt-3 w-full" variant="outline" onClick={onGoToIntegrations}>
              Open Social Connections
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
          <div className="text-sm font-semibold">Step 2: Create your first post</div>
          <div className="text-xs text-slate-400 mt-1">
            {hasAnyPost ? 'Completed' : 'Draft content, add hashtags/media, and pick platforms.'}
          </div>
          {!hasAnyPost && (
            <Button className="mt-3 w-full" onClick={onOpenPostCreator}>
              Open Post Creator
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
          <div className="text-sm font-semibold">Step 3: Schedule and publish</div>
          <div className="text-xs text-slate-400 mt-1">
            {hasScheduledOrPublished
              ? 'Completed. Your first campaign is in motion.'
              : 'Set a future publish time to queue your campaign.'}
          </div>
        </div>

        <Button className="w-full" variant="secondary" onClick={onClose}>
          Close Wizard
        </Button>
      </div>
    </Dialog>
  );
}

