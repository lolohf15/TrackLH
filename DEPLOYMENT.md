# Deployment Guide — TrackLH

Stack: **GitHub → Vercel** (hosting) + **Supabase** (Postgres database) + **Notion** (data source)

---

## 1. Supabase — Create the database

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name (e.g. `tracklh`), set a strong database password, pick the closest region
3. Wait for the project to be ready (~1 min)

### Get your connection strings

Go to **Settings → Database → Connection string**

**Direct URL** (for migrations):
```
postgresql://postgres:[password]@db.[project-ref].supabase.com:5432/postgres
```

**Pooled URL** (for the app at runtime):  
Go to **Settings → Database → Connection pooling → Transaction mode**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Add `?pgbouncer=true&connection_limit=1` to the pooled URL.

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

Add all four variables in **Project Settings → Environment Variables** (for Production, Preview, and Development):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase pooled URL (`?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | Supabase direct URL |
| `NOTION_API_KEY` | Your Notion integration secret |
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

For local dev, you can keep using SQLite — just keep a separate `.env` with `DATABASE_URL="file:./dev.db"` and omit `DIRECT_URL`. Switch back to the Supabase URLs when you want to test against the production database.

Alternatively, keep a local Postgres via Docker:

```bash
docker run --name tracklh-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tracklh"
# DIRECT_URL same as DATABASE_URL when not using a pooler locally
```
