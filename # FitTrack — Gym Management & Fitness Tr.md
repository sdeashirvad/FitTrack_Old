# FitTrack — Gym Management & Fitness Tracking App

FitTrack is a comprehensive gym management and fitness tracking platform tailored for gyms. It features a React Native mobile application for members, trainers, and owners, a robust Express API backend, and a unified PostgreSQL database with Drizzle ORM.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- `pnpm` (v9+)
- PostgreSQL (or Supabase)

### 1. Install Dependencies
Run from the root of the workspace:
```bash
pnpm install
```

### 2. Environment Configuration

Before starting the applications, you must configure your environment variables. 
Copy the example environment files to their respective locations:

1. **Root Configuration**:
   ```bash
   cp .env.example .env
   ```
   *Used by the backend API and root scripts.*

2. **Database Configuration**:
   ```bash
   cp lib/db/.env.example lib/db/.env
   ```
   *Used by Drizzle ORM for schema pushes and migrations.*

**Key Variables in `.env`:**
- `DATABASE_URL`: Connection string to your PostgreSQL/Supabase database.
- `JWT_SECRET`: Secret key for signing JSON Web Tokens.
- `SUPABASE_URL` & `SUPABASE_ANON_KEY`: Credentials for Supabase Auth/Storage.

### 3. Start the Backend API
```bash
cd artifacts/api-server
pnpm run dev
```
*(Runs on port 3000 by default)*

### 4. Start the Mobile App
```bash
cd artifacts/mobile
pnpm run dev
```
*(Opens Expo developer tools; scan the QR code with Expo Go or run on a simulator)*

### 5. UI Mockup Sandbox (Optional)
If you want to work on UI components in isolation:
```bash
cd artifacts/mockup-sandbox
pnpm run dev
```

---

## 🏗️ Architecture & Project Connections

FitTrack is structured as a pnpm workspace (monorepo). It heavily utilizes code generation to maintain strict type safety and a single source of truth between the backend and frontend.

### Workspace Structure

- `artifacts/mobile` (Frontend): React Native Expo application.
- `artifacts/api-server` (Backend): Express.js REST API.
- `artifacts/mockup-sandbox`: Vite React environment for building UI components independently.
- `lib/api-spec`: The single source of truth OpenAPI specification (`openapi.yaml`).
- `lib/api-client-react`: Auto-generated React Query hooks and fetch client used by the mobile app.
- `lib/api-zod`: Auto-generated Zod schemas for API validation.
- `lib/db`: Shared PostgreSQL database schema and Drizzle ORM configuration.

### How Projects are Connected

```mermaid
flowchart TD
    subgraph Frontend
        Mobile[📱 Mobile App\n(React Native / Expo)]
        Mockup[🎨 Mockup Sandbox\n(Vite / React)]
    end

    subgraph API & Types
        APIClient[🔌 lib/api-client-react\n(Generated Hooks)]
        APISpec[📄 lib/api-spec\n(OpenAPI YAML)]
        ZodTypes[🛡️ lib/api-zod\n(Generated Zod Schemas)]
    end

    subgraph Backend
        APIServer[⚙️ API Server\n(Express.js)]
    end

    subgraph Data
        DBLayer[🗄️ lib/db\n(Drizzle ORM)]
        Postgres[(PostgreSQL\nDatabase)]
    end

    %% Dependencies
    APISpec -.-> |Generates| APIClient
    APISpec -.-> |Generates| ZodTypes

    Mobile --> |Imports| APIClient
    APIClient --> |HTTP Requests| APIServer
    
    APIServer --> |Validates Payload| ZodTypes
    APIServer --> |Imports| DBLayer
    
    DBLayer --> |SQL Queries| Postgres
```

### Dependency Flow Summary:
1. **API Contract**: Everything starts with `lib/api-spec/openapi.yaml`. 
2. **Code Generation**: The OpenAPI spec generates TypeScript clients (`lib/api-client-react`) and Validation schemas (`lib/api-zod`).
3. **Frontend Integration**: `artifacts/mobile` imports the generated hooks from `lib/api-client-react` to make type-safe network requests.
4. **Backend Integration**: `artifacts/api-server` imports `lib/api-zod` for request validation and `lib/db` to interact with the database.

---

## 🔑 Environment Variables & `.env` Usage

Environment variables are critical for connecting the various moving parts. Here is a detailed breakdown:

### 1. Root Workspace (`/.env`)
Create this file from `/.env.example`. It primarily drives the `api-server`.

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Direct connection to Postgres for the API server to read/write data. | `postgresql://user:pass@db.url:5432/db` |
| `JWT_SECRET` | Used by the API server to sign and verify custom JWTs for authentication. | `super-secret-key` |
| `SUPABASE_URL` | Used by the API server (and potentially mobile) to interact with Supabase services. | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Public key for Supabase initialization. | `eyJhbGci...` |

### 2. Database Package (`/lib/db/.env`)
Create this file from `/lib/db/.env.example`.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Used exclusively by `drizzle-kit` (e.g., via `pnpm db:push` or `pnpm db:generate`) to inspect, migrate, or push schema changes directly to the database. |

*Note: The `DATABASE_URL` in both `.env` files is usually identical in local development.*

---

## 🛠️ Common Workspace Commands

From the root directory, you can run the following workspace commands:

- `pnpm install`: Install dependencies across all packages.
- `pnpm run typecheck`: Run TypeScript type-checking on all packages.
- `pnpm run build`: Typecheck and build all packages (API server, libs, etc.).
- `pnpm db:push`: Push local Drizzle schema changes directly to the configured database.
- `pnpm db:studio`: Open Drizzle Studio to visually inspect and manage your database data.

## 🤝 Development Workflow

1. **Changing the Database:**
   - Update `lib/db/src/schema/`
   - Run `pnpm db:push` from the root.
   - Use the updated types in your backend/frontend.

2. **Adding an API Endpoint:**
   - Update `lib/api-spec/openapi.yaml`.
   - Run code generation (usually via a script in the `api-spec` package if configured, or automatically during build).
   - Implement the route in `artifacts/api-server/src/routes/`.
   - Call the new hook in `artifacts/mobile` (e.g., `useGetNewEndpoint()`).
