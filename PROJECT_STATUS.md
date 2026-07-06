# OptiMeal Project Status

## Overview
OptiMeal is a Vite + React + TypeScript nutrition tracking application with Supabase for authentication, database, and storage.

Current status: MVP is implemented and production build is passing.

- Last verified build command: npm run build
- Build status: passing
- Scope completed: auth, profile, meals CRUD, dashboard analytics, photo upload/retrieval, AI-ready recommendation and analysis interfaces, responsive UI

## What Is Implemented

### Authentication
- Email/password signup and login implemented via Supabase Auth.
- Google OAuth entry points are present in UI and service layer.
- Password reset request flow implemented.
- Protected route enforcement implemented for authenticated-only pages.
- Auth session tracking implemented with context subscription.

Primary files:
- [src/services/authService.ts](src/services/authService.ts)
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)
- [src/components/RouteGuard.tsx](src/components/RouteGuard.tsx)
- [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx)
- [src/pages/SignupPage.tsx](src/pages/SignupPage.tsx)
- [src/pages/ForgotPasswordPage.tsx](src/pages/ForgotPasswordPage.tsx)

### Profile and Goals
- Profile bootstrap on first authenticated session is implemented.
- Profile editing and persistence are implemented.
- Nutrition goals are saved and surfaced on dashboard widgets.

Primary files:
- [src/contexts/ProfileContext.tsx](src/contexts/ProfileContext.tsx)
- [src/services/profileService.ts](src/services/profileService.ts)
- [src/services/nutritionGoalsService.ts](src/services/nutritionGoalsService.ts)
- [src/pages/ProfilePage.tsx](src/pages/ProfilePage.tsx)

### Meals and Dashboard
- Meal create, edit, delete, and refresh persistence implemented.
- Meal ID generation and meal photo record ID generation are implemented in service layer.
- Dashboard progress cards, summaries, timeline, goals panel, and recommendations panel implemented.
- Empty states are present for timeline and meal list.

Primary files:
- [src/services/mealsService.ts](src/services/mealsService.ts)
- [src/services/mealPhotosService.ts](src/services/mealPhotosService.ts)
- [src/contexts/NutritionContext.tsx](src/contexts/NutritionContext.tsx)
- [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx)
- [src/components/MealForm.tsx](src/components/MealForm.tsx)
- [src/components/MealEditorDialog.tsx](src/components/MealEditorDialog.tsx)
- [src/components/MealList.tsx](src/components/MealList.tsx)
- [src/components/MealTimeline.tsx](src/components/MealTimeline.tsx)
- [src/components/ProgressCard.tsx](src/components/ProgressCard.tsx)
- [src/components/GoalsSummary.tsx](src/components/GoalsSummary.tsx)
- [src/components/NutritionSummary.tsx](src/components/NutritionSummary.tsx)

### Photos and Storage
- Meal photo upload and retrieval are implemented using Supabase Storage bucket meals.
- Storage object policies and bucket provisioning are included in migration.
- Broken image handling fallback is implemented in uploader UI.

Primary files:
- [src/services/storageService.ts](src/services/storageService.ts)
- [src/components/FoodPhotoUploader.tsx](src/components/FoodPhotoUploader.tsx)
- [supabase_local/migrations/0002_storage_meals.sql](supabase_local/migrations/0002_storage_meals.sql)

### AI Service Layer
- Mock-only service has been replaced by a backend-ready interface in aiService.
- Current behavior:
  - Uses configured AI API base URL if present.
  - Falls back to deterministic local estimates/recommendations when API is not configured or fails.

Primary files:
- [src/services/aiService.ts](src/services/aiService.ts)
- [src/components/RecommendationsPanel.tsx](src/components/RecommendationsPanel.tsx)
- [src/components/FoodPhotoUploader.tsx](src/components/FoodPhotoUploader.tsx)

## Architecture

### Frontend stack
- React 19 + TypeScript
- React Router for navigation
- Context-based state for auth, profile, nutrition domain state
- Framer Motion for transitions
- Tailwind utility classes for styling

### Data flow
- UI pages/components call domain hooks.
- Hooks consume contexts.
- Contexts call service-layer functions.
- Service layer is the only layer talking to Supabase client.

### Contexts
- Auth context
  - Session/user lifecycle, auth listener
- Profile context
  - Profile fetch/bootstrap/save and goal-related profile fields
- Nutrition context
  - Meal collection lifecycle, meal CRUD, computed summary

Files:
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)
- [src/contexts/ProfileContext.tsx](src/contexts/ProfileContext.tsx)
- [src/contexts/NutritionContext.tsx](src/contexts/NutritionContext.tsx)

## Database Schema and Policies

Schema source:
- [supabase_local/migrations/0001_init.sql](supabase_local/migrations/0001_init.sql)
- [supabase_local/migrations/0002_storage_meals.sql](supabase_local/migrations/0002_storage_meals.sql)

### Core tables
- profiles
  - id uuid primary key
  - email text unique not null
  - display_name text
  - created_at, updated_at timestamptz
- nutrition_goals
  - id uuid primary key
  - user_id uuid references profiles(id)
  - calories, protein, carbs, fat integer
  - active boolean
  - unique user_id + active
- meals
  - id uuid primary key
  - user_id uuid references profiles(id)
  - name, calories, protein, carbs, fat
  - photo_url, photo_path, notes
  - created_at, updated_at
- meal_photos
  - id uuid primary key
  - meal_id uuid references meals(id)
  - user_id uuid references profiles(id)
  - storage_path, public_url
  - created_at

### Storage
- Bucket: meals
- Public read policy for meal images
- Authenticated insert/delete policy constrained to user-owned object prefix

### RLS
RLS enabled on all public domain tables:
- profiles
- nutrition_goals
- meals
- meal_photos

Owner-based policies are in place for select/insert/update/delete as applicable.

## Route Map
Route definitions are in [src/App.tsx](src/App.tsx).

Public routes:
- /login
- /signup
- /forgot-password

Protected routes:
- /dashboard
- /profile
- /settings

Other:
- / redirects to /dashboard
- wildcard route renders not found page

Page files:
- [src/pages/HomePage.tsx](src/pages/HomePage.tsx)
- [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx)
- [src/pages/SignupPage.tsx](src/pages/SignupPage.tsx)
- [src/pages/ForgotPasswordPage.tsx](src/pages/ForgotPasswordPage.tsx)
- [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx)
- [src/pages/ProfilePage.tsx](src/pages/ProfilePage.tsx)
- [src/pages/SettingsPage.tsx](src/pages/SettingsPage.tsx)
- [src/pages/NotFoundPage.tsx](src/pages/NotFoundPage.tsx)

## Component Inventory

Dashboard and shared:
- [src/components/Navbar.tsx](src/components/Navbar.tsx)
- [src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx)
- [src/components/Button.tsx](src/components/Button.tsx)
- [src/components/RouteGuard.tsx](src/components/RouteGuard.tsx)

Nutrition and meal features:
- [src/components/MealForm.tsx](src/components/MealForm.tsx)
- [src/components/MealList.tsx](src/components/MealList.tsx)
- [src/components/MealEditorDialog.tsx](src/components/MealEditorDialog.tsx)
- [src/components/MealTimeline.tsx](src/components/MealTimeline.tsx)
- [src/components/FoodPhotoUploader.tsx](src/components/FoodPhotoUploader.tsx)
- [src/components/ProgressCard.tsx](src/components/ProgressCard.tsx)
- [src/components/GoalsSummary.tsx](src/components/GoalsSummary.tsx)
- [src/components/NutritionSummary.tsx](src/components/NutritionSummary.tsx)
- [src/components/RecommendationsPanel.tsx](src/components/RecommendationsPanel.tsx)

Landing and marketing:
- [src/components/FeatureCard.tsx](src/components/FeatureCard.tsx)
- [src/components/HowItWorksCard.tsx](src/components/HowItWorksCard.tsx)
- [src/components/TestimonialCard.tsx](src/components/TestimonialCard.tsx)
- [src/components/FAQItem.tsx](src/components/FAQItem.tsx)
- [src/components/Footer.tsx](src/components/Footer.tsx)
- [src/components/SectionHeading.tsx](src/components/SectionHeading.tsx)

## Service Inventory

Supabase and domain services:
- [src/services/supabaseClient.ts](src/services/supabaseClient.ts)
- [src/services/authService.ts](src/services/authService.ts)
- [src/services/profileService.ts](src/services/profileService.ts)
- [src/services/nutritionGoalsService.ts](src/services/nutritionGoalsService.ts)
- [src/services/mealsService.ts](src/services/mealsService.ts)
- [src/services/mealPhotosService.ts](src/services/mealPhotosService.ts)
- [src/services/storageService.ts](src/services/storageService.ts)

AI and generic utilities:
- [src/services/aiService.ts](src/services/aiService.ts)
- [src/services/api.ts](src/services/api.ts)

## Environment and Configuration

Runtime env vars:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- Optional: VITE_AI_API_BASE_URL

Files:
- [.env](.env)
- [.env.example](.env.example)

## Remaining Known Issues

1. Logout request observability noise
- Functional logout works, but browser instrumentation may show an aborted logout request event.
- Impact: low functional impact, medium monitoring noise.
- Related files:
  - [src/services/authService.ts](src/services/authService.ts)
  - [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx)

2. Password reset can hit Supabase email rate limits under repeated QA requests
- Endpoint may return 429 email rate limit exceeded during high-frequency manual testing.
- Impact: expected platform throttling behavior.
- Related files:
  - [src/pages/ForgotPasswordPage.tsx](src/pages/ForgotPasswordPage.tsx)
  - [src/services/authService.ts](src/services/authService.ts)

3. Bundle size warning
- Production build warns that one chunk exceeds 500 kB.
- Impact: performance optimization opportunity.
- Suggested area:
  - [src/App.tsx](src/App.tsx) and route-level code splitting strategy

4. QA artifact present in root
- [qa-test.png](qa-test.png) was created for photo upload QA and can be removed if no longer needed.

## Recommended Next Development Priorities

1. Stabilize auth observability
- Investigate and eliminate logout aborted request noise in browser network telemetry.
- Add explicit frontend logging categorization for expected auth transitions.

2. Improve production performance
- Introduce route-level lazy loading with Suspense.
- Split large dashboard feature chunks.
- Re-measure initial load and hydration timings.

3. Harden form and error UX
- Add inline numeric constraints and normalized validation messaging consistency across profile/meal forms.
- Improve API error mapping from Supabase error objects to user-facing messages.

4. Expand automated testing
- Add integration tests for auth guard behavior and session persistence.
- Add service-level tests for meals/profile CRUD.
- Add end-to-end smoke tests for primary user journey.

5. Complete AI backend integration
- Stand up AI endpoints expected by aiService.
- Add request/response contract validation and retry/backoff behavior.

6. Security and operations
- Review OAuth redirect URLs and production auth settings.
- Validate storage bucket and object policy behavior in production environment.
- Add operational runbook for Supabase migration and rollback process.

## Handoff Notes

- Migration state was verified as aligned for 0001 and 0002.
- Supabase directory strategy currently includes both supabase_local and supabase for CLI compatibility in this workspace.
- The application is handoff-ready for performance hardening and pre-launch operational polish.