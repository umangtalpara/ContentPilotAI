# Frontend App Flow Review

Date: 2026-05-30  
Project: ContentPilot AI

## 1) What is the current landing page?

Current landing page route `/` renders `Dashboard`:
- `codebase/frontend/src/app/page.tsx` -> `<Dashboard />`
- `codebase/frontend/src/components/Dashboard.tsx` currently uses mock analytics data and is not connected to auth/workspace context.

This means your root entry is a demo-style page, not a true product entry flow.

## 2) Current implemented flow (as-built)

### Entry and auth
1. User opens `/`.
2. User sees mock dashboard (not auth gated).
3. User can go to `/login` or `/register`.
4. Login/Register calls backend auth endpoints:
   - `POST /auth/login`
   - `POST /auth/register`
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
   - connect LinkedIn/X using callback URLs
   - list/disconnect integrations per workspace.

### Publishing execution
1. Backend queues post at creation time.
2. At schedule time, worker moves status `SCHEDULED -> PUBLISHING -> PUBLISHED` (or `FAILED`).
3. If platform integration missing, publish fails and post gets `FAILED`.

## 3) Current flow issues (important)

### P0 (high impact)
1. Root landing mismatch:
   - `/` is mock dashboard, not a real landing/auth entry.
2. Dead link:
   - Login page links to `/forgot-password`, but route does not exist.
3. Integration callback host hardcoded:
   - Backend redirect uses `http://localhost:3000/...`, risky for staging/prod.
4. Connect flow bypasses normal OAuth initiation:
   - Frontend directly hits callback URL with `code=mock-code`.
   - Works for mock mode, but not strong for real OAuth UX/security model.

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
- Completed: Replaced hardcoded callback redirect host with env-based frontend URL in backend integration callbacks.
- Completed: Introduced explicit OAuth start endpoint:
  - `GET /workspaces/:workspaceId/integrations/:platform/start`
  - Callback endpoints now handle provider return only.
- Completed: Frontend integration connect action now uses start endpoint instead of direct callback call.

Notes:
- `forgot-password` page is currently placeholder UX until reset-token backend endpoints are implemented.
- OAuth start endpoint supports mock and production paths based on env/client configuration.
