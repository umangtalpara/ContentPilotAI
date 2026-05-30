# Frontend App Flow Review

Date: 2026-05-30  
Project: ContentPilot AI

## 1) What is the current landing page?

Current landing page route `/` is now auth-aware:
- unauthenticated users see a product entry page with `Create Account` and `Sign In` CTAs.
- authenticated users are redirected to `/workspaces`.

Reference:
- `codebase/frontend/src/app/page.tsx`

## 2) Current implemented flow (as-built)

### Entry and auth
1. User opens `/`.
2. If unauthenticated, user sees landing CTAs (`/login` or `/register`).
3. If authenticated, user is redirected to `/workspaces`.
4. Login/Register calls backend auth endpoints:
   - `POST /auth/login`
   - `POST /auth/register`
   - `POST /auth/forgot-password`
   - `POST /auth/reset-password`
5. Tokens are stored in localStorage (`cp_access_token`, `cp_refresh_token`).
6. User is routed to `/workspaces`.

### Session and route protection
1. `AuthProvider` bootstraps session with `/auth/me`.
2. `workspaces/layout.tsx` redirects to `/login` when no authenticated user.
3. `api.ts` retries once after `401` by calling `/auth/refresh`, then redirects to `/login` if refresh fails.

### Workspace and content operations
1. On register, app auto-creates a default workspace.
2. In `/workspaces`, user can:
   - switch/create workspace
   - invite members
   - open `Create Post` dialog
   - open `Bulk Upload` dialog
   - view calendar/integrations/analytics tabs
3. Post creation:
   - optional media upload via `/media/presigned` + `/media/upload`
   - optional AI caption generation via `/ai/generate-caption`
   - post scheduled via `POST /workspaces/:workspaceId/posts`
4. Scheduled post is queued by backend queue service and later auto-published if integration exists.
5. Integrations:
   - connect LinkedIn/X using OAuth start endpoint first
   - list/disconnect integrations per workspace.

### Publishing execution
1. Backend queues post at creation time.
2. At schedule time, worker moves status `SCHEDULED -> PUBLISHING -> PUBLISHED` (or `FAILED`).
3. If platform integration missing, publish fails and post gets `FAILED`.

## 3) Current flow issues (important)

### P0 (high impact)
1. No open P0 items from Phase A.
2. Completed and resolved:
   - `/` auth-aware landing implemented.
   - `/forgot-password` route added.
   - real reset-password API flow added.
   - callback redirect host moved to env config.
   - OAuth start endpoint introduced before callback handling.

### P1 (flow quality)
1. No enforced "connect channel first" guard before scheduling.
2. No publishing status-focused UX in calendar cards (status exists in backend but limited visibility in UI cards).
3. Alerts used in calendar reschedule errors; should be consistent in-app feedback.
4. No first-time onboarding checklist after signup.

### P2 (polish)
1. Main `Dashboard` component duplicates conceptually with `/workspaces`.
2. Some UI text/icons show encoding artifacts in several components.
3. Post-publish observability is split across tabs and not surfaced as a single "publishing health" view.

## 4) Best recommended user flow (target)

### Ideal user journey
1. User opens `/`.
2. If not authenticated:
   - show product landing with clear CTA: `Sign up` / `Login`.
3. After register/login:
   - auto-create/select workspace
   - show onboarding checklist:
     - connect at least one platform
     - create first post
     - schedule first publish
4. In post creator:
   - show integration readiness (LinkedIn/X connected or not)
   - block publish scheduling for unconnected selected platforms, or auto-adjust platform selection.
5. After scheduling:
   - show queued confirmation with next publish time
   - live status badges: `Scheduled`, `Publishing`, `Published`, `Failed`
   - failed items show reason + one-click retry.
6. Analytics tab:
   - include "Publishing success rate" and "Failed posts needing action".

## 5) Recommended implementation plan

### Phase A (stability and correctness)
1. Replace `/` mock dashboard with auth-aware entry:
   - unauthenticated -> landing page
   - authenticated -> redirect to `/workspaces`.
2. Add `/forgot-password` page or remove link.
3. Replace hardcoded callback redirects with frontend URL env config.
4. Introduce explicit OAuth start endpoints and keep callback for provider return only.

### Phase B (flow optimization)
1. Add onboarding checklist component post-login/register.
2. Add integration guard in `PostCreatorDialog`.
3. Add post status badge and failure reason surfacing in `CalendarGrid`.
4. Add retry publish action for failed posts.

### Phase C (growth UX)
1. Add guided "Create first campaign" wizard.
2. Add analytics KPI cards for publish reliability.
3. Add notifications/toasts for invite, schedule, publish success/failure.

## 6) Code evidence used

- Frontend entry and auth:
  - `codebase/frontend/src/app/page.tsx`
  - `codebase/frontend/src/components/Dashboard.tsx`
  - `codebase/frontend/src/app/(auth)/login/page.tsx`
  - `codebase/frontend/src/app/(auth)/register/page.tsx`
  - `codebase/frontend/src/context/AuthContext.tsx`
  - `codebase/frontend/src/utils/api.ts`
  - `codebase/frontend/src/app/workspaces/layout.tsx`
- Frontend workspace operations:
  - `codebase/frontend/src/app/workspaces/page.tsx`
  - `codebase/frontend/src/components/PostCreatorDialog.tsx`
  - `codebase/frontend/src/components/BulkUploadDialog.tsx`
  - `codebase/frontend/src/components/CalendarGrid.tsx`
  - `codebase/frontend/src/components/IntegrationsList.tsx`
  - `codebase/frontend/src/components/AiAssistantDrawer.tsx`
- Backend publishing and integrations:
  - `codebase/backend/src/modules/auth/auth.controller.ts`
  - `codebase/backend/src/modules/workspaces/workspaces.controller.ts`
  - `codebase/backend/src/modules/posts/posts.controller.ts`
  - `codebase/backend/src/modules/posts/posts.service.ts`
  - `codebase/backend/src/modules/storage/storage.controller.ts`
  - `codebase/backend/src/modules/ai/ai.controller.ts`
  - `codebase/backend/src/modules/integrations/integrations.controller.ts`
  - `codebase/backend/src/modules/integrations/integrations.service.ts`
  - `codebase/backend/src/modules/queue/queue.service.ts`
  - `codebase/backend/src/modules/analytics/analytics.controller.ts`

## 7) Phase A Implementation Status

Status date: 2026-05-30

- Completed: Auth-aware `/` entry flow.
  - Unauthenticated users see landing CTA.
  - Authenticated users are redirected to `/workspaces`.
- Completed: Added `/forgot-password` page to resolve login dead link.
- Completed: Added `/reset-password` page and backend token-based reset APIs.
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
- Completed: Replaced hardcoded callback redirect host with env-based frontend URL in backend integration callbacks.
- Completed: Introduced explicit OAuth start endpoint:
  - `GET /workspaces/:workspaceId/integrations/:platform/start`
  - Callback endpoints now handle provider return only.
- Completed: Frontend integration connect action now uses start endpoint instead of direct callback call.
- Completed: Gmail SMTP mailer integration for transactional notifications.
  - Password reset email with real reset link.
  - Workspace invite email notification.

Notes:
- In non-production, reset token may still be returned when SMTP is not configured to support local testing.
- OAuth start endpoint supports mock and production paths based on env/client configuration.

## 8) Recommended Fixes Status (Current)

### Phase B (implemented on 2026-05-30)
1. Added onboarding checklist component in workspace dashboard:
   - connect platform
   - create first post
   - schedule/publish first post
2. Added integration guard in `PostCreatorDialog`:
   - selected disconnected platforms are flagged
   - scheduling is blocked until selected platforms are connected
3. Added post status badge and failure reason surfacing in `CalendarGrid`.
4. Added retry publish action for failed posts:
   - frontend retry button in calendar
   - backend retry endpoint: `POST /workspaces/:workspaceId/posts/:id/retry`

### Phase C (implemented on 2026-05-30)
1. Added guided "First Campaign Wizard" flow in workspace UI.
2. Added analytics KPI strip for publish reliability:
   - publish success rate
   - reliability (30d)
   - failed posts needing action
3. Added global notifications/toasts:
   - invite success/failure
   - schedule/reschedule success/failure
   - retry publish success/failure
   - publish success/failure surfaced from activity feed events
