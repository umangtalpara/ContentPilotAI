import { z } from 'zod';
import { SocialPlatform, UserRole } from './types';

// Auth Validation Schemas
export const RegisterSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }).max(50),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
});

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
});

// Workspace Validation Schemas
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(3, { message: 'Workspace name must be at least 3 characters long' }).max(50),
});

export const InviteMemberSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Invalid role selection' }) }),
});

// Post Validation Schemas
export const CreatePostSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }).max(100),
  caption: z.string().max(3000, { message: 'Caption cannot exceed 3000 characters' }),
  description: z.string().optional(),
  hashtags: z.array(z.string()).max(30, { message: 'Maximum of 30 hashtags allowed' }).default([]),
  mediaUrls: z.array(z.string().url({ message: 'Invalid media URL' })).max(10, { message: 'Maximum of 10 attachments allowed' }).default([]),
  platforms: z.array(z.nativeEnum(SocialPlatform)).min(1, { message: 'Select at least one social media platform' }),
  scheduleAt: z.string().datetime({ message: 'Schedule date must be a valid ISO-8601 datetime' }),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
});

export const UpdatePostSchema = CreatePostSchema.partial();

// Comment Validation Schemas
export const CreateCommentSchema = z.object({
  content: z.string().min(1, { message: 'Comment content cannot be empty' }).max(1000),
});

// Types inferred from Schemas
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
