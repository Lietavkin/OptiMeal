# AI Handoff: OptiMeal

## 0. Purpose
This document is the authoritative handoff for any future AI coding agent working on OptiMeal.

Goal: allow immediate continuation of development without rediscovery.

Scope: current implementation state, architecture, priorities, constraints, and non-negotiable guardrails.

---

## 1. Current Implementation Status
- Project stage: MVP implemented, production build passing.
- Stack: Vite + React 19 + TypeScript + Supabase.
- Auth: email/password + Google entrypoint + password reset.
- Core product loop: profile/goals -> meal logging -> dashboard summaries/progress -> recommendations.
- Storage: meal photo upload/retrieval via Supabase Storage bucket meals.
- AI layer: backend-ready service interface with deterministic fallback when AI API is unavailable.

Current verified command outcome:
- npm run build: passing

---

## 2. Completed Features

### Authentication
- Signup/login with Supabase auth.
- Route protection via guard.
- Session-aware app bootstrapping.
- Password reset request flow.

### Profile
- First-login profile bootstrap from auth user.
- Profile edit + persistence.
- Goal persistence and dashboard propagation.

### Meals
- Create/edit/delete meal records.
- Validation for required name and non-negative macros.
- Persistence across refresh.
- Empty states for no data.

### Photos
- Upload meal image to storage bucket meals.
- Persist photo URL/path in DB.
- Retrieval on refresh.
- Broken image fallback message in UI.

### Dashboard
- Nutrition summaries.
- Goal progress cards.
- Meal timeline.
- Recommendations panel with add-to-meal action.

### Handoff/strategy docs already present
- PROJECT_STATUS.md
- OPTIMEAL_VISION.md

---

## 3. Database Schema

Migration sources:
- supabase_local/migrations/0001_init.sql
- supabase_local/migrations/0002_storage_meals.sql

### Public tables
- profiles
  - id uuid PK
  - email text unique not null
  - display_name text
  - created_at, updated_at timestamptz

- nutrition_goals
  - id uuid PK
  - user_id uuid FK -> profiles.id
  - calories/protein/carbs/fat ints
  - active boolean
  - unique(user_id, active)

- meals
  - id uuid PK
  - user_id uuid FK -> profiles.id
  - name, calories, protein, carbs, fat
  - photo_url, photo_path, notes
  - created_at, updated_at

- meal_photos
  - id uuid PK
  - meal_id uuid FK -> meals.id
  - user_id uuid FK -> profiles.id
  - storage_path, public_url
  - created_at

### RLS
RLS enabled for profiles, nutrition_goals, meals, meal_photos with owner-based access policies.

### Storage
- Bucket: meals
- Policies:
  - public read for bucket objects
  - authenticated insert/delete constrained to user folder prefix

---

## 4. Folder Architecture

Top-level (relevant)
- src/: frontend app source
- supabase_local/: authoritative migration/config directory
- supabase/: CLI-compat mirror used in this workspace for certain Supabase CLI operations
- PROJECT_STATUS.md, OPTIMEAL_VISION.md: strategy/handoff docs

src/
- components/: reusable UI and domain UI blocks
- contexts/: AuthContext, ProfileContext, NutritionContext
- hooks/: typed context hooks and media-query hook
- pages/: route-level pages
- services/: all Supabase and domain I/O
- types/: shared TypeScript domain types
- layouts/, utils/, lib/: UI structure + utilities

---

## 5. Authentication Flow
1. App mounts AuthProvider.
2. AuthProvider reads current session (supabase.auth.getSession).
3. AuthProvider subscribes to auth state changes.
4. RouteGuard blocks protected routes unless user is authenticated.
5. ProfileProvider loads profile by auth user ID; bootstraps row if missing.
6. Sign-out currently uses supabase.auth.signOut({ scope: 'local' }).

Public routes:
- /login
- /signup
- /forgot-password

Protected routes:
- /dashboard
- /profile
- /settings

---

## 6. Services and Responsibilities
- services/supabaseClient.ts
  - Create configured Supabase client from env vars.

- services/authService.ts
  - signup/login/google/login state change/reset password/sign out wrappers.

- services/profileService.ts
  - profile fetch/upsert + active goal join mapping.

- services/nutritionGoalsService.ts
  - active nutrition goal get/upsert.

- services/mealsService.ts
  - meal CRUD + DB-to-domain mapping + UUID assignment on insert.

- services/mealPhotosService.ts
  - meal_photos insert + UUID assignment.

- services/storageService.ts
  - bucket upload/delete + photo metadata write.

- services/aiService.ts
  - AI food analysis + recommendation interface.
  - Uses VITE_AI_API_BASE_URL when configured.
  - Falls back to deterministic local estimators on failure/missing config.

- services/api.ts
  - generic fetch helper (limited usage).

---

## 7. Context Providers
- AuthContext
  - user/session/loading state.
  - source of truth for auth lifecycle.

- ProfileContext
  - profile/loading/saveProfile.
  - auto-seeds profile when missing.

- NutritionContext
  - meals list, computed summary, loading.
  - addMeal/removeMeal/updateMeal/refresh.

Hooks mirror providers:
- useAuth
- useProfile
- useNutrition

---

## 8. API Flow
UI -> Hook -> Context -> Service -> Supabase

Pattern details:
- Pages/components never call Supabase directly.
- Context layer orchestrates state and side effects.
- Service layer owns DB/storage/auth API contracts.
- Domain mapping happens in services to keep UI typed and stable.

AI flow:
- UI calls aiService.
- aiService attempts AI backend endpoint.
- On failure/no config, returns fallback deterministic output.

---

## 9. Known Technical Debt
1. Auth logout observability noise
- Browser/network instrumentation can show aborted logout request event despite functional sign-out.

2. Limited automated tests
- No established integration/e2e suite yet.

3. Bundle size warning
- Single chunk exceeds default warning threshold; route-level split not yet implemented.

4. Supabase directory duality
- Both supabase_local and supabase exist to accommodate CLI behavior in this workspace.
- Requires discipline to keep migrations mirrored where needed.

5. Some UX error states are basic
- Messaging can be improved and standardized for all API failures.

---

## 10. Remaining Bugs (Known)
1. Logout request can appear as requestFailed net::ERR_ABORTED in browser tooling even though session clears.
- Functional impact: low.
- Observability impact: medium.

2. Password reset may return 429 under frequent repeated QA requests (Supabase email rate limits).
- Functional impact: low/expected throttling.
- Operational impact: medium for stress testing.

---

## 11. High-Priority Next Milestones
1. Eliminate logout observability noise or classify it as expected event in monitoring.
2. Introduce route-based lazy loading and chunk optimization.
3. Implement robust automated QA baseline:
- Auth flow tests
- Profile/meal CRUD tests
- Dashboard smoke tests
4. Complete AI backend endpoints and contract validation.
5. Add migration/runbook discipline and environment promotion checklist.

---

## 12. Coding Conventions Used
- TypeScript strictness and explicit domain typing.
- Functional React components.
- Context + hook access pattern for app state.
- Service isolation for all backend I/O.
- Tailwind utility-first styling.
- Minimal comments; only where logic is non-obvious.
- File naming: PascalCase for components/pages, camelCase for services/hooks/utils.

---

## 13. Design Principles
- Clear visual hierarchy and simple action-first flows.
- Responsive behavior prioritized for desktop + mobile.
- Empty states and loading states included for core screens.
- Data summaries must update from single source of truth (NutritionContext/ProfileContext).
- Recommendation UI should remain actionable with safe fallbacks.

---

## 14. Development Workflow
1. Pull latest and inspect current project docs:
- PROJECT_STATUS.md
- OPTIMEAL_VISION.md
- AI_HANDOFF.md

2. Make smallest scoped change possible.
3. Keep service/context boundaries intact.
4. Run build and verify no TypeScript regressions.
5. If touching auth/data flows, run browser QA path manually.
6. Update handoff docs when architecture/state meaningfully changes.

---

## 15. Build/Test Commands
- Install: npm install
- Dev server: npm run dev
- Production build: npm run build
- Lint: npm run lint
- Preview production build: npm run preview

Notes:
- Current project has no formal automated test script in package.json.

---

## 16. Deployment Checklist
1. Environment
- Set VITE_SUPABASE_URL
- Set VITE_SUPABASE_ANON_KEY
- Optional VITE_AI_API_BASE_URL

2. Supabase
- Confirm project linkage and migration status.
- Ensure 0001 and 0002 applied in target environment.
- Verify bucket meals exists and storage policies are present.
- Validate auth settings (redirects, providers, email templates).

3. App verification
- Build succeeds (npm run build).
- Auth: signup/login/logout/protected route behavior.
- Profile persistence after refresh.
- Meal CRUD and photo upload/retrieval.

4. Observability
- Monitor auth/logout network events.
- Monitor reset password rate-limit frequency.

---

## 17. Things Future AI Agents MUST NOT Change
1. Do not bypass context/service architecture by calling Supabase directly from UI components.
2. Do not remove or weaken RLS/storage policy assumptions in migrations.
3. Do not break route protection semantics for /dashboard, /profile, /settings.
4. Do not replace existing deterministic AI fallback behavior unless a stable backend endpoint is live.
5. Do not delete or rewrite migration history to “fix” drift; use proper migration repair/versioning.
6. Do not hardcode credentials, tokens, or environment secrets in source.
7. Do not introduce schema-breaking changes without a migration and backward compatibility plan.

---

## 18. Recommended Order of Future Implementation
1. Reliability hardening
- Resolve logout observability behavior.
- Improve auth/reset error handling UX.

2. Performance
- Route-level code splitting.
- Bundle analysis and optimization.

3. Test foundation
- Add integration tests for auth + protected routes.
- Add CRUD tests for meals/profile services.
- Add minimal e2e smoke flow.

4. AI backend completion
- Implement /analyze-food and /recommend-meals endpoints.
- Add response schema validation and fallback telemetry.

5. Planning and commerce roadmap
- Weekly planner foundation.
- Shopping list generation.
- Grocery/store integration layer.

6. Mobile and scaling workstream
- Prepare shared contracts for native app clients.
- Introduce telemetry/event model required for optimization engine evolution.

---

## Quick Start for Next AI Agent
1. Read this file first.
2. Read PROJECT_STATUS.md for current verified implementation.
3. Read OPTIMEAL_VISION.md for long-term strategy alignment.
4. Run npm install then npm run build.
5. Continue from section 18 in order unless product owner reprioritizes.