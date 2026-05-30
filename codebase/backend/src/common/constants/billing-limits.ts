import { SubscriptionTier } from '../../modules/users/schemas/user.schema';

export interface PlanLimits {
  workspaces: number;
  members: number;
  integrations: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  [SubscriptionTier.FREE]: {
    workspaces: 1,
    members: 1, // Only the owner can belong
    integrations: 1,
  },
  [SubscriptionTier.PRO]: {
    workspaces: 3,
    members: 5,
    integrations: 3,
  },
  [SubscriptionTier.AGENCY]: {
    workspaces: 999999, // unlimited
    members: 999999,
    integrations: 999999,
  },
};
