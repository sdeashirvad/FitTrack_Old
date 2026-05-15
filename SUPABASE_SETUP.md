# Supabase Setup Guide for FitTrack

## 1. Add Your Supabase Connection String

Create or update `lib/db/.env`, or `.env` in the repo root, with your Supabase direct Postgres URL. Drizzle DB commands read `lib/db/.env` first, then fall back to the repo root `.env`.

```env
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres?sslmode=require&uselibpqcompat=true"
```

You can find this in Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI.

For Drizzle schema commands, prefer the direct connection URL if your network supports IPv6. If it does not, use the Session pooler connection string from Supabase instead.

## 2. Create Tables In Supabase

From the repo root:

```bash
pnpm db:push
```

If Drizzle exits without a useful error, check the raw database connection first:

```bash
pnpm db:check-connection
```

Or from `lib/db`:

```bash
pnpm push
```

This pushes the Drizzle schema in `lib/db/src/schema` to your Supabase database so the tables appear in the Supabase Table Editor.

## 3. Use SQL Migrations Instead Of Direct Push

Generate migration SQL:

```bash
pnpm db:generate
```

Apply generated migrations:

```bash
pnpm db:migrate
```

For normal early development, `pnpm db:push` is the quickest way to sync tables. For production-like workflows, use `generate` plus `migrate` and commit the generated `lib/db/drizzle` files.

## 4. View Tables With Drizzle Studio

```bash
pnpm db:studio
```

You can also view the same tables in Supabase Dashboard -> Table Editor.

## Troubleshooting

- `DATABASE_URL is not set`: add it to `.env` or `lib/db/.env`.
- `password authentication failed`: replace `[YOUR_PASSWORD]` with the database password from Supabase.
- `connection refused` or timeout: confirm the project is active and the URL host/project ref is correct.
- SSL certificate errors: use `?sslmode=require&uselibpqcompat=true`, or use `sslmode=verify-full` with Supabase's CA certificate via `sslrootcert`.
