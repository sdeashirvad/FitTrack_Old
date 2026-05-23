# FitTrack Feature Inventory

This document summarizes the features already implemented in the FitTrack application, based on the current monorepo contents.

## 1. Authentication & Onboarding
- Email/password registration and login.
- Google sign-in support.
- Phone number OTP login flow.
- Role selection during registration: **member**, **trainer**, **owner**.
- Onboarding setup wizard after signup, collecting:
  - personal and health profile data
  - fitness goals and activity level
  - dietary preferences and workout experience
  - role-specific details for trainers and gym owners
- Auth state management via `artifacts/mobile/context/AuthContext.tsx`.

## 2. Mobile App Core Screens
### Main app structure
- Expo Router navigation with authenticated flow and role-aware redirects.
- Bottom tab navigation with primary sections:
  - `Home`
  - `Workout`
  - `Diet`
  - `Gym`
  - `Profile`

### Authentication screens
- `artifacts/mobile/app/(auth)/login.tsx`
  - toggle between sign-in and register
  - choose login via email/password, phone OTP, or Google
- `artifacts/mobile/app/(auth)/setup.tsx`
  - multi-step setup wizard
  - user profile and preferences capture
  - persists onboarding completion to backend and user state

## 3. Fitness & Workout Features
- `artifacts/mobile/app/(tabs)/workout.tsx`
  - quick workout logging
  - suggested workouts (push/pull/leg/HIIT templates)
  - weekly plan navigation
  - InBody analysis entry point
  - recent workout history display
- `artifacts/mobile/app/workout/weekly-plan.tsx`
  - weekly workout planning and schedule (screen exists in app hierarchy)

## 4. InBody & AI Analysis
- `artifacts/mobile/app/inbody/index.tsx`
  - image capture via camera
  - image selection from gallery
  - PDF upload support
  - backend upload and progress tracking
  - AI-powered body composition analysis
  - plan selection for trainer or AI recommendations
  - health summary, metrics, and suggested workout/diet guidance
- `artifacts/mobile/hooks/useInbodyService.ts`
  - dedicated API service for InBody uploads and analysis

## 5. Diet Tracking
- `artifacts/mobile/app/(tabs)/diet.tsx`
  - add meals from a pre-populated food list
  - custom meal entry with calories
  - calorie goal tracking and remaining calories
  - macro summary (protein, carbs, fat)
  - meal grouping by breakfast / lunch / dinner / snack

## 6. Gym, Booking & Attendance
- `artifacts/mobile/app/(tabs)/gym.tsx`
  - membership dashboard and active member status
  - QR-style attendance check-in flow
  - time slot booking UI for gym sessions
  - trainer matching / booking interface
  - role-aware gym panel for members, trainers, and owners

## 7. Profile & Analytics
- `artifacts/mobile/app/(tabs)/profile.tsx`
  - user profile details and role badge
  - recent workout and streak stats
  - achievements overview
  - pull-to-refresh profile data
  - logout and role switcher demo
- `artifacts/mobile/app/analytics.tsx`
  - workout streak and summary metrics
  - InBody report history
  - BMI and trends insights
  - upload and analyze body composition files

## 8. Backend & API Support
- `artifacts/api-server/`
  - Express.js REST API backend
  - auth routes under `src/routes/auth.ts`
  - InBody upload and analysis routes in `src/routes/inbody.ts` and `src/routes/inbody.controller.ts`
  - health check endpoint in `src/routes/health.ts`
  - central Express app setup in `src/app.ts`
- Type-safe contract-first architecture via `lib/api-spec/openapi.yaml`.
- Generated API client in `lib/api-client-react/` and Zod validation schemas in `lib/api-zod/`.
- PostgreSQL database support through Supabase and Drizzle ORM.

## 9. Developer & Platform Features
- Monorepo managed by `pnpm` and workspace packages.
- Expo-based React Native mobile app.
- Mockup sandbox for UI development in `artifacts/mockup-sandbox/`.
- Shared UI primitives and theme support in `artifacts/mobile/components/ui/`.

## 10. Notable Implemented UX Patterns
- modern glassmorphism-style cards and gradient buttons
- progressive onboarding flow with animated steps
- mobile-first responsive layout
- haptic feedback integration
- role-sensitive content and conditional feature display

## Summary
FitTrack already includes a robust fitness app experience with:
- multi-role authentication
- onboarding and profile setup
- workout planning and logging
- diet logging and macro tracking
- gym attendance, booking, and trainer discovery
- InBody report upload, OCR/AI analysis, and plan recommendations
- responsive React Native UI backed by a TypeScript Express API

This feature inventory can be used as a launchpad for planning enhancements, bug fixes, or new modules.
