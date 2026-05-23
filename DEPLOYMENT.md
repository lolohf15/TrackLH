# Deployment Guide — TrackLH

Stack: **GitHub → Vercel** (hosting) + **Supabase** (Postgres database) + **Notion** (data source)

---

## 1. Supabase — Create the database

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name (e.g. `tracklh`), set a strong database password, pick the closest region
3. Wait for the project to be ready (~1 min)

### Get your connection strings

**`DATABASE_URL` — Session-mode pooler (for the app at runtime)**

Go to **Settings → Database → Connection pooling → Session mode**

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

> ⚠️ Use **port 5432** (session mode). Do NOT use port 6543 (transaction mode) — Prisma 6
> creates prepared statements that break under PgBouncer transaction mode (error 26000).

**`DIRECT_URL` — Direct connection (for migrations only)**

Go to **Settings → Database → Connection string → URI**

```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

---

## 2. Run the migration locally (first time only)

Create a local `.env` file (not committed):

```bash
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, NOTION_API_KEY, NOTION_DATABASE_ID
```

Then apply the migration to Supabase:

```bash
npx prisma migrate deploy
```

This creates the four tables (`Transaction`, `SyncLog`, `AccountConfig`, `BudgetConfig`) in your Supabase database.

---

## 3. Vercel — Deploy the app

### Connect the repo

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your `TrackLH` GitHub repository
3. Framework preset: **Next.js** (auto-detected)

### Build settings

Set the **Build Command** to:

```
npx prisma migrate deploy && next build
```

Leave Install Command as `npm install` (it runs `postinstall` → `prisma generate` automatically).

### Environment variables

Add all four in **Project Settings → Environment Variables** (Production + Preview + Development):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Session-mode pooler URL (port **5432** on pooler host) |
| `DIRECT_URL` | Direct connection URL (port 5432 on `db.*.supabase.co`) |
| `NOTION_API_KEY` | Your Notion integration secret (`ntn_...`) |
| `NOTION_DATABASE_ID` | Your Notion database ID |

### Deploy

Click **Deploy**. Vercel will:
1. Run `npm install` → triggers `prisma generate`
2. Run `npx prisma migrate deploy` → applies migration to Supabase
3. Run `next build`

---

## 4. Ongoing workflow

- **Push to `main`** → Vercel auto-deploys
- **Schema changes** → add a new migration with `npx prisma migrate dev --name <description>`, commit the migration file, push
- **Sync data** → use the Sincronizar button in the UI; it fetches from Notion and upserts into Supabase

---

## Local development

Use the direct Supabase connection for local dev (no pooler, no connection limits):

```
# .env (not committed)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

Alternatively, run a local Postgres via Docker:

```bash
docker run --name tracklh-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tracklh"
# DIRECT_URL same as DATABASE_URL
```
