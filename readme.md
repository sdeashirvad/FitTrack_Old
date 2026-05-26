# FitTrack — Gym Management & Fitness Tracking Platform

> A full-stack, type-safe monorepo — React Native mobile app, Express.js REST API, and a PostgreSQL database via Supabase, all wired together by a single OpenAPI contract.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%2054-black?logo=expo)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?logo=pnpm)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Project Structure](#-project-structure)
3. [How Everything is Connected](#-how-everything-is-connected)
4. [Environment Variables](#-environment-variables)
5. [Starting the Project](#-starting-the-project)
   - [Backend API](#1-backend-api)
   - [Mobile App (LAN)](#2-mobile-app--lan-mode)
   - [Mobile App (Expo Tunnel)](#3-mobile-app--expo-tunnel-mode)
   - [Mockup Sandbox](#4-ui-mockup-sandbox-optional)
6. [All Important Commands](#️-all-important-commands)
7. [Database Schema & ER Diagram](#️-database-schema)
8. [API Route Modules](#-api-route-modules)
9. [Authentication Flow](#-authentication-flow)
10. [Development Workflows](#-development-workflows)
11. [Mobile App Screens](#-mobile-app-screens)
12. [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

FitTrack serves three user roles — **owners**, **trainers**, and **members** — through a single React Native app. The backend is a contract-first Express API: one `openapi.yaml` file drives code generation for both TypeScript React Query hooks (used on mobile) and Zod validation schemas (used on the server), keeping frontend and backend in strict type-safe sync.

---

## 📁 Project Structure

```
fittrack/                          ← Monorepo root (pnpm workspace)
│
├── artifacts/
│   ├── api-server/                ← Express.js REST API (Backend)
│   │   └── src/
│   │       ├── app.ts             ← Express app setup (CORS, JSON, routes)
│   │       ├── index.ts           ← Server entry — reads PORT env, starts listener
│   │       ├── routes/            ← 17 feature route modules (auth, workouts, etc.)
│   │       ├── middlewares/       ← Auth middleware, error handlers
│   │       └── lib/               ← Logger (pino), shared helpers
│   │
│   ├── mobile/                    ← React Native Expo App (Frontend)
│   │   ├── app/
│   │   │   ├── _layout.tsx        ← Root layout: fonts, providers, Stack navigator
│   │   │   ├── index.tsx          ← Entry redirect (auth check)
│   │   │   ├── (auth)/            ← Login + Onboarding screens
│   │   │   ├── (tabs)/            ← Bottom-tab screens: Home, Workout, Diet, Gym, Profile
│   │   │   ├── analytics.tsx      ← Analytics full-screen
│   │   │   ├── inbody.tsx         ← InBody body composition screen
│   │   │   └── workout/           ← Workout detail screens
│   │   ├── components/            ← Reusable UI components
│   │   ├── context/
│   │   │   ├── AuthContext.tsx    ← Auth state (token, user, login/logout)
│   │   │   └── FitnessContext.tsx ← Fitness/gym state shared across tabs
│   │   ├── hooks/                 ← Custom hooks
│   │   └── constants/colors.ts   ← Design system color tokens
│   │
│   └── mockup-sandbox/            ← Vite + React for isolated UI dev
│
├── lib/
│   ├── api-spec/
│   │   ├── openapi.yaml           ← THE source of truth for all API contracts
│   │   └── orval.config.ts        ← Code generation config (Orval)
│   ├── api-client-react/          ← Auto-generated: React Query hooks + fetch client
│   ├── api-zod/                   ← Auto-generated: Zod request/response schemas
│   └── db/
│       ├── src/schema/            ← All Drizzle ORM table definitions (17 files)
│       ├── drizzle.config.ts      ← Drizzle Kit config (reads lib/db/.env)
│       └── .env / .env.example    ← DB-only env for drizzle-kit commands
│
├── .env / .env.example            ← Root env: used by api-server at runtime
├── package.json                   ← Root workspace scripts (db:push, typecheck, build…)
└── pnpm-workspace.yaml            ← Declares all workspace packages
```

---

## 🔗 How Everything is Connected

```mermaid
flowchart TD
    subgraph Source["📄 Single Source of Truth"]
        YAML["lib/api-spec/openapi.yaml"]
    end

    subgraph Generated["⚙️ Code Generation (Orval)"]
        Hooks["lib/api-client-react<br/>React Query hooks + typed fetch"]
        Zod["lib/api-zod<br/>Zod request/response schemas"]
    end

    subgraph Frontend["📱 Mobile App — artifacts/mobile"]
        App["Expo Router Screens"]
        Auth["AuthContext.tsx<br/>(token, user state)"]
        Fit["FitnessContext.tsx<br/>(gym + fitness state)"]

        App --> Auth
        App --> Fit
    end

    subgraph Backend["⚙️ API Server — artifacts/api-server"]
        Routes["Express Routes /api/*"]
        MW["Auth Middleware<br/>(JWT verify)"]

        Routes --> MW
    end

    subgraph Data["🗄️ Data Layer"]
        DB["lib/db<br/>Drizzle ORM"]
        PG[("PostgreSQL<br/>Supabase")]

        DB --> PG
    end

    YAML -.->|"pnpm orval"| Hooks
    YAML -.->|"pnpm orval"| Zod

    App -->|"imports generated hooks"| Hooks
    Hooks -->|"HTTP Bearer JWT"| Routes

    Routes -->|"validate payload"| Zod
    Routes -->|"query"| DB
```

### How a mobile API call flows end-to-end

```mermaid
sequenceDiagram
    participant Screen as 📱 Screen (React)
    participant Hook as 🔌 useGetWorkouts()<br/>(generated hook)
    participant API as ⚙️ Express /api/workouts
    participant Auth as 🔒 Auth Middleware
    participant DB as 🗄️ Drizzle ORM

    Screen->>Hook: render / trigger query
    Hook->>API: GET /api/workouts\nAuthorization: Bearer <token>
    API->>Auth: verify JWT
    Auth-->>API: userId extracted
    API->>DB: db.select().from(workoutSessions)
    DB-->>API: rows
    API-->>Hook: 200 JSON
    Hook-->>Screen: data / isLoading / error
```

---

## 🔑 Environment Variables

FitTrack has **two** separate `.env` files with different scopes. You must configure both.

```mermaid
graph LR
    E1["/.env\n(repo root)"] -->|"loaded by dotenv at startup"| API["api-server\nExpress app"]
    E2["/lib/db/.env"] -->|"read by drizzle-kit CLI"| DK["drizzle-kit\npnpm db:push / db:generate"]
    E1 -.->|"fallback if lib/db/.env missing"| DK
```

### `/.env` — Root (API Server runtime)

Copy from `/.env.example`:

```bash
cp .env.example .env
```

| Variable | Where to get it | Required |
|---|---|:---:|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **URI** | ✅ |
| `JWT_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) | ✅ |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` key | ✅ |
| `PORT` | Optional — defaults to **5000** | ❌ |

```env
# /.env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require&uselibpqcompat=true"
JWT_SECRET="replace-with-a-long-secure-secret"
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_ANON_KEY="eyJhbGci..."
```

---

### `/lib/db/.env` — Database / Drizzle Kit

Copy from `/lib/db/.env.example`:

```bash
cp lib/db/.env.example lib/db/.env
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Used **only** by `drizzle-kit` CLI for `db:push`, `db:generate`, `db:migrate`, `db:studio` |

```env
# /lib/db/.env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require&uselibpqcompat=true"
```

> **Tip:** In local dev both files usually have the same `DATABASE_URL`. For migrations prefer the **direct** connection URL (not the pooler).

---

## 🚀 Starting the Project

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm i -g pnpm` |
| Expo CLI | bundled | via `@expo/cli` in devDeps |
| Expo Go (phone) | latest | App Store / Play Store |

### Install all workspace dependencies (run once from root)

```bash
pnpm install
```

---

### 1. Backend API

```bash
# From the repo root
cd artifacts/api-server
pnpm run dev
```

What `dev` does internally:

```
NODE_ENV=development → pnpm run build → esbuild bundles src/ → node ./dist/index.mjs
```

| Detail | Value |
|---|---|
| Default port | **5000** (override with `PORT=xxxx` in `.env`) |
| Base path | `http://localhost:5000/api` |
| Health check | `GET http://localhost:5000/api/health` |
| Logging | [pino](https://getpino.io/) — structured JSON logs |

> The API server reads `.env` from the **repo root** via `dotenv`.

---

### 2. Mobile App — LAN Mode

Use this when your phone/emulator is on the **same Wi-Fi** as your dev machine.

```bash
cd artifacts/mobile
pnpm run dev
```

This starts Expo on `--localhost` mode. Scan the QR code in **Expo Go** or press:
- `i` — open iOS Simulator
- `a` — open Android Emulator
- `w` — open in web browser

> **Note:** In LAN mode the mobile app must be able to reach your computer's local IP where the API server is running.

---

### 3. Mobile App — Expo Tunnel Mode

Use **Tunnel** when:
- Your phone is on a **different network** (e.g., mobile data)
- You're working behind a **corporate firewall / VPN**
- LAN mode doesn't connect

```bash
# Install the global tunnel dependency once
npm install -g @expo/ngrok

# Then start with tunnel flag
cd artifacts/mobile
pnpm exec expo start --tunnel
```

Or via `npx` without a global install:

```bash
cd artifacts/mobile
pnpm exec expo start --tunnel --port 8081
```

```mermaid
graph LR
    Phone["📱 Expo Go\n(any network)"] -->|"ngrok HTTPS tunnel"| Ngrok["☁️ ngrok relay\n*.ngrok.io"]
    Ngrok -->|"forwards to"| Metro["Metro Bundler\nlocalhost:8081"]
    Metro -->|"serves JS bundle"| Phone
    Phone -->|"API calls"| APIServer["⚙️ API Server\nlocalhost:5000"]
```

> ⚠️ When using tunnel, the mobile app **still** calls your API server directly. Make sure `api-server` is also reachable — either exposed via its own tunnel, or your phone is on the same network as the API.

#### Exposing the API server via tunnel too

```bash
# In a separate terminal — expose API server through ngrok
npx ngrok http 5000
```

Then update the base URL used in `lib/api-client-react` to point to your ngrok URL.

---

### 4. UI Mockup Sandbox (Optional)

Develop UI components in isolation without needing the API or mobile:

```bash
cd artifacts/mockup-sandbox
pnpm run dev
```

---

## 🛠️ All Important Commands

### Root workspace (run from project root)

| Command | What it does |
|---|---|
| `pnpm install` | Install all packages in every workspace |
| `pnpm run build` | Typecheck + build all packages (`api-server`, libs) |
| `pnpm run typecheck` | Run `tsc --noEmit` on all packages |
| `pnpm db:push` | Push Drizzle schema → Supabase (fast, no migration file) |
| `pnpm db:push-force` | Force-push schema — drops & recreates (⚠️ destructive) |
| `pnpm db:generate` | Generate SQL migration files from schema changes |
| `pnpm db:migrate` | Run generated migrations against the database |
| `pnpm db:check` | Diff local schema vs live database |
| `pnpm db:check-connection` | Test raw DB connectivity |
| `pnpm db:studio` | Open Drizzle Studio at http://local.drizzle.studio |

### API Server (`cd artifacts/api-server`)

| Command | What it does |
|---|---|
| `pnpm run dev` | Build + start server (development) |
| `pnpm run build` | Compile TypeScript via esbuild → `dist/` |
| `pnpm run start` | Start pre-built server (`node ./dist/index.mjs`) |
| `pnpm run typecheck` | Type-check without emitting |

### Mobile App (`cd artifacts/mobile`)

| Command | What it does |
|---|---|
| `pnpm run dev` | Start Expo (localhost mode, for Replit/CI) |
| `pnpm exec expo start` | Standard Expo start (LAN mode) |
| `pnpm exec expo start --tunnel` | Start with ngrok tunnel (cross-network) |
| `pnpm exec expo start --ios` | Start + open iOS Simulator |
| `pnpm exec expo start --android` | Start + open Android Emulator |
| `pnpm exec expo start --web` | Start + open browser (web) |
| `pnpm run build` | Production bundle via `scripts/build.js` |
| `pnpm run typecheck` | Type-check without emitting |

### Expo keyboard shortcuts (inside the Metro terminal)

| Key | Action |
|---|---|
| `i` | Open iOS Simulator |
| `a` | Open Android Emulator |
| `w` | Open in web browser |
| `r` | Reload the app |
| `m` | Toggle dev menu |
| `j` | Open debugger |
| `?` | Show all options |
| `Ctrl+C` | Stop Expo |

---

## 🗄️ Database Schema

All tables live in `lib/db/src/schema/`. Drizzle ORM manages the schema definition, type inference, and migrations.

### Core ER Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        text email UK
        text phone
        enum primary_role "member | trainer | owner"
        enum status "pending | active | suspended"
        bool is_email_verified
    }
    USER_PROFILES {
        uuid user_id PK,FK
        text first_name
        text last_name
        text gender
        date date_of_birth
        text avatar_url
    }
    GYMS {
        uuid id PK
        text name
        text slug UK
        uuid owner_user_id FK
        text timezone
        text currency
        enum billing_cycle
    }
    GYM_LOCATIONS {
        uuid id PK
        uuid gym_id FK
        text name
        text address
        text city
        text country
    }
    GYM_TRAINERS {
        uuid id PK
        uuid gym_id FK
        uuid user_id FK
        text specialty
        numeric rating_avg
    }
    GYM_MEMBERSHIP_PLANS {
        uuid id PK
        uuid gym_id FK
        text name
        integer price_cents
        enum billing_cycle
        bool is_trial
    }
    MEMBERSHIPS {
        uuid id PK
        uuid gym_id FK
        uuid user_id FK
        uuid plan_id FK
        timestamp start_date
        timestamp end_date
        enum status "active | cancelled | expired"
        bool auto_renew
    }
    WORKOUT_PLAN_TEMPLATES {
        uuid id PK
        uuid gym_id FK
        uuid created_by FK
        text title
        enum level "beginner | intermediate | advanced"
        integer duration_weeks
    }
    WORKOUT_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid trainer_user_id FK
        timestamp session_date
        enum status "planned | completed | skipped"
    }
    TRAINING_SESSIONS {
        uuid id PK
        uuid trainer_user_id FK
        uuid member_user_id FK
        timestamp scheduled_start
        timestamp scheduled_end
        enum status "scheduled | completed | cancelled"
    }
    AI_PLAN_REQUESTS {
        uuid id PK
        uuid user_id FK
        uuid gym_id FK
        enum request_type
        enum status "queued | processing | done | failed"
    }

    USERS ||--o| USER_PROFILES : "has"
    USERS ||--o{ MEMBERSHIPS : "holds"
    USERS ||--o{ WORKOUT_SESSIONS : "logs"
    GYMS ||--o{ GYM_LOCATIONS : "has"
    GYMS ||--o{ GYM_TRAINERS : "employs"
    GYMS ||--o{ GYM_MEMBERSHIP_PLANS : "offers"
    GYM_MEMBERSHIP_PLANS ||--o{ MEMBERSHIPS : "subscribed via"
    GYM_TRAINERS ||--o{ TRAINING_SESSIONS : "conducts"
    USERS ||--o{ TRAINING_SESSIONS : "attends"
    GYMS ||--o{ WORKOUT_PLAN_TEMPLATES : "owns"
    USERS ||--o{ AI_PLAN_REQUESTS : "requests"
```

### Schema file → tables mapping

| File | Tables defined |
|---|---|
| `users.ts` | `users`, `user_profiles`, `auth_sessions`, `refresh_tokens`, `password_reset_tokens`, `mfa_devices`, `roles` |
| `gyms.ts` | `gyms`, `gym_locations`, `gym_settings`, `gym_membership_plans`, `gym_trainers`, `gym_user_roles` |
| `memberships.ts` | `memberships`, `subscription_invoices`, `payments`, `payment_methods`, `promotions` |
| `workouts.ts` | `exercises`, `exercise_categories`, `workout_plan_templates`, `workout_plan_days`, `workout_plan_items`, `workout_sessions`, `workout_session_items`, `exercise_progress`, `exercise_variations`, `member_workout_plans` |
| `scheduling.ts` | `trainer_availability`, `training_sessions`, `session_bookings`, `class_sessions`, `booking_cancellations` |
| `diet.ts` | meal plans, food items, diet logs |
| `analytics.ts` | activity logs, revenue snapshots, attendance records |
| `ai.ts` | `ai_plan_requests`, `ai_plan_responses`, `ai_recommendation_feedback` |
| `communications.ts` | messages, notifications, notification preferences |
| `security.ts` | security events |
| `audit.ts` | `audit_logs` |
| `lookups.ts` | all PostgreSQL enums (role types, statuses, billing cycles…) |

---

## 🔌 API Route Modules

All routes are mounted under `/api/` in `artifacts/api-server/src/routes/`.

```mermaid
mindmap
  root(("/api"))
    auth
      POST /login
      POST /register
      POST /refresh
      POST /logout
      POST /password-reset
    users
      GET/PATCH /me
      GET /users/:id
      PATCH /roles
    gyms
      CRUD /gyms
      /gyms/:id/locations
      /gyms/:id/trainers
      /gyms/:id/membership-plans
      /gyms/:id/settings
    workouts
      /exercises  CRUD
      /workout-plans  CRUD
      /workout-sessions  log
      /exercise-progress  track
    scheduling
      /trainer-availability
      /training-sessions  book
      /class-sessions
    memberships
      /memberships  subscribe
      /invoices
      /payments
      /promotions
    diet
      /meal-plans
      /food-logs
    analytics
      /activity
      /revenue
      /attendance
    ai
      POST /ai/request
      GET /ai/responses
      POST /ai/feedback
    reviews
      /trainer-reviews
    communications
      /notifications
      /messages
    support
      /tickets
    security
      /sessions  revoke
      /audit-logs
    files
      POST /upload
    lookups
      GET /enums
    health
      GET /health
```

---

## 🔐 Authentication Flow

FitTrack uses a **custom JWT + Supabase** dual strategy. Access tokens are short-lived; refresh tokens are stored in the database and rotated on each use.

```mermaid
sequenceDiagram
    actor User
    participant App as 📱 Mobile App<br/>AuthContext.tsx
    participant API as ⚙️ Express API<br/>/api/auth/*
    participant Supabase as ☁️ Supabase Auth
    participant DB as 🗄️ PostgreSQL

    User->>App: Enter email + password
    App->>API: POST /api/auth/login
    API->>Supabase: Verify credentials
    Supabase-->>API: ✅ identity confirmed

    API->>DB: INSERT auth_session
    API->>DB: INSERT refresh_token (hashed)
    API-->>App: { accessToken (JWT 15m), refreshToken (UUID 30d) }
    App->>App: Store tokens in AsyncStorage

    Note over App,API: Every subsequent request
    App->>API: GET /api/workouts<br/>Authorization: Bearer <accessToken>
    API->>API: Verify JWT (secret, expiry)
    API->>DB: Query data
    API-->>App: 200 + data

    Note over App,API: When accessToken expires (401)
    App->>API: POST /api/auth/refresh { refreshToken }
    API->>DB: Validate token (not revoked, not expired)
    API->>DB: Rotate — revoke old, INSERT new refresh_token
    API-->>App: { new accessToken, new refreshToken }
    App->>App: Update AsyncStorage

    Note over App,API: Logout
    App->>API: POST /api/auth/logout
    API->>DB: Revoke auth_session + refresh_token
    API-->>App: 200 OK
    App->>App: Clear AsyncStorage, redirect to login
```

---

## 🤝 Development Workflows

### Changing the Database Schema

```mermaid
flowchart LR
    A["1️⃣ Edit\nlib/db/src/schema/*.ts"] --> B["2️⃣ pnpm db:push\n(fast, no migration file)"]
    B --> C["3️⃣ OR: pnpm db:generate\n+ pnpm db:migrate\n(keeps migration history)"]
    C --> D["4️⃣ Updated Drizzle types\navailable in lib/db exports"]
    D --> E["5️⃣ Use in api-server\nroutes & queries"]
```

**When to use which:**
- `db:push` — fast, for early dev, no migration history
- `db:generate` + `db:migrate` — for production, keeps a committed migration log

---

### Adding a New API Endpoint

```mermaid
flowchart TD
    A["1️⃣ Define in\nlib/api-spec/openapi.yaml\n(path, request, response schemas)"] --> B["2️⃣ Run code generation\npnpm orval (in api-spec package)"]
    B --> C["3️⃣ lib/api-client-react updated\nnew hook e.g. usePostNewEndpoint()"]
    B --> D["3️⃣ lib/api-zod updated\nnew Zod schema for validation"]
    C --> E["4️⃣ Import hook in\nartifacts/mobile screen"]
    D --> F["4️⃣ Use schema in\nartifacts/api-server/src/routes/"]
```

---

### User Roles & Access

```mermaid
graph TD
    U["👤 User Account"] --> M["🏃 Member"]
    U --> T["💪 Trainer"]
    U --> O["🏢 Owner"]

    M --> M1["Log workout sessions"]
    M --> M2["Book trainer sessions"]
    M --> M3["Track diet & body metrics"]
    M --> M4["View membership & invoices"]
    M --> M5["Request AI plans"]

    T --> T1["Set availability slots"]
    T --> T2["Assign workout plans to members"]
    T --> T3["Conduct training sessions"]
    T --> T4["View assigned member progress"]

    O --> O1["Manage gym settings & locations"]
    O --> O2["Create & price membership plans"]
    O --> O3["Manage trainers & staff roles"]
    O --> O4["View analytics & revenue"]
    O --> O5["Create promotions & discounts"]
    O --> O6["Send communications to members"]
```

---

## 📱 Mobile App Screens

The Expo app uses **file-based routing** via Expo Router:

| Route | Screen | Description |
|---|---|---|
| `/` | `index.tsx` | Auth guard — redirects to login or tabs |
| `/(auth)/login` | Login | Email + password login, social auth |
| `/(auth)/onboarding` | Onboarding | First-time setup wizard |
| `/(tabs)/` | Home | Dashboard — quick stats, upcoming sessions |
| `/(tabs)/workout` | Workouts | Active plan, session logging |
| `/(tabs)/diet` | Diet | Meal plan, food log, macros |
| `/(tabs)/gym` | Gym | Gym info, trainers, class schedule |
| `/(tabs)/profile` | Profile | User settings, membership, InBody history |
| `/analytics` | Analytics | Charts — activity, attendance, progress |
| `/inbody` | InBody | Body composition measurement entry & history |
| `/workout/weekly-plan` | Weekly Plan | Full weekly workout plan view |

---

## 🔧 Troubleshooting

### API Server won't start

| Problem | Fix |
|---|---|
| `DATABASE_URL is not set` | Add it to `/.env` |
| `Invalid PORT value` | Set `PORT` in `.env` to a valid number, or remove it (defaults to 5000) |
| `password authentication failed` | Check your Supabase DB password in `DATABASE_URL` |
| Connection timeout | Confirm Supabase project is active; try `pnpm db:check-connection` |
| SSL errors | Append `?sslmode=require&uselibpqcompat=true` to `DATABASE_URL` |

### Mobile App issues

| Problem | Fix |
|---|---|
| QR code won't scan | Use `--tunnel` mode instead of LAN |
| `Network request failed` | The app can't reach the API — check IP/port; try exposing API via ngrok |
| Blank screen on start | Check Metro bundler logs for a JS error; run `pnpm run typecheck` |
| `Unable to resolve module` | Run `pnpm install` from root; clear Expo cache with `--clear` flag |
| Expo Go version mismatch | Update Expo Go on your device to the latest version |

### Clear Expo cache

```bash
cd artifacts/mobile
pnpm exec expo start --clear
```

### Database / Drizzle issues

| Problem | Fix |
|---|---|
| `DATABASE_URL is not set` (drizzle-kit) | Add it to `lib/db/.env` |
| Schema push fails silently | Run `pnpm db:check-connection` first to verify connectivity |
| Tables missing in Supabase | Run `pnpm db:push` from the repo root |
| Migration conflict | Use `pnpm db:push-force` (**drops data** — dev only) |

---

## 📌 Additional Resources

- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — Step-by-step Supabase project configuration
- [`lib/api-spec/openapi.yaml`](./lib/api-spec/openapi.yaml) — Full OpenAPI specification (source of truth)
- [`lib/db/src/schema/`](./lib/db/src/schema/) — All Drizzle ORM table definitions
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Expo Router Docs](https://expo.github.io/router/)
- [Orval — OpenAPI code generator](https://orval.dev/)
- [Supabase Docs](https://supabase.com/docs)

---

<div align="center">
  <sub>FitTrack © 2026 · MIT License</sub>
</div>
