# FitTrack — Gym Management & Fitness Tracking App

A premium mobile app for gym management and fitness tracking, targeting local Indian gyms. Supports members, trainers, and gym owners.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: React Native + Expo (SDK 54), expo-router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
- `artifacts/mobile/app/` — Expo Router screens
- `artifacts/mobile/app/(auth)/` — Onboarding + Login
- `artifacts/mobile/app/(tabs)/` — Main tab screens (Home, Workout, Diet, Gym, Profile)
- `artifacts/mobile/app/analytics.tsx` — Analytics screen
- `artifacts/mobile/context/AuthContext.tsx` — Auth state with role switching
- `artifacts/mobile/context/FitnessContext.tsx` — Fitness data (calories, water, meals, workouts)
- `artifacts/mobile/components/ui/` — Reusable UI components
- `artifacts/mobile/constants/colors.ts` — Design tokens (dark navy + electric blue theme)
- `artifacts/api-server/` — Express API server
- `lib/api-spec/openapi.yaml` — OpenAPI contract

## Architecture decisions

- Frontend-only for first build: all data persisted via AsyncStorage (no backend calls yet)
- Three user roles: member, trainer, owner — switch via Profile tab for demo
- Dark navy (#070B14) + electric cyan (#00D4FF) theme — premium fitness aesthetic
- Animated progress rings (react-native-reanimated) for calorie/water tracking
- Indian food database pre-loaded with 500+ items in Diet tab

## Product

- **Member**: Dashboard with calorie/water/macro rings, workout logging, Indian food diet tracker, QR check-in, slot/trainer booking, achievements, analytics
- **Trainer**: Panel showing trainer-specific UI
- **Owner**: Gym overview with member count, attendance, revenue stats
- Onboarding flow → role-based login → 5-tab navigation

## User preferences

- Build mobile-first, native UI patterns
- Dark mode by default
- No emojis in UI (except greeting in dashboard)
- Indian food focus for diet tracking

## Gotchas

- User role is stored in AsyncStorage; switching role reloads the user object
- AsyncStorage key: `@fittrack_user` for auth, `@fittrack_today` for daily fitness log
- Scan QR in Expo Go via the QR code in Replit's URL bar to test on physical device

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
