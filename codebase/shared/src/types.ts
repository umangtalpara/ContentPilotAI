// Shared enums and type definitions for ContentPilot AI

export enum UserRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum SocialPlatform {
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
}

export enum SubscriptionPlan {
  FREE = 'free',
  PRO = 'pro',
  AGENCY = 'agency',
}

// User interfaces
export interface IUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Workspace interfaces
export interface IWorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface IWorkspace {
  id: string;
  name: string;
  ownerId: string;
  members: IWorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
}

// Post interfaces
export interface IPost {
  id: string;
  workspaceId: string;
  title: string;
  caption: string;
  description?: string;
  hashtags: string[];
  mediaUrls: string[];
  platforms: SocialPlatform[];
  status: PostStatus;
  scheduleAt: string; // ISO string format
  publishedAt?: string;
  errorMessage?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: string;
  updatedAt: string;
}

// Social account interfaces
export interface ISocialAccount {
  id: string;
  workspaceId: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  avatarUrl?: string;
  createdAt: string;
}

// Billing interfaces
export interface IBillingSubscription {
  id: string;
  workspaceId: string;
  plan: SubscriptionPlan;
  status: string;
  currentPeriodEnd: string;
  aiCreditsRemaining: number;
}

// Comment interfaces
export interface IComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
}

// Activity log interfaces
export interface IActivityLog {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  action: string;
  details: Record<string, any>;
  createdAt: string;
}

// API Response Wrappers
export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
