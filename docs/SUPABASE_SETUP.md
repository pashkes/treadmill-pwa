# Supabase Setup

This app works without Supabase. Configure Supabase only when you want email/password accounts and cloud sync.

## Create Project

1. Open https://supabase.com/dashboard.
2. Sign in or create a Supabase account.
3. Click **New project**.
4. Choose or create an organization.
5. Enter a project name, for example `walking-app`.
6. Generate and save the database password in your password manager.
7. Choose the closest region.
8. Click **Create new project** and wait until the project is ready.

## Configure Auth

1. Open the created project.
2. Go to **Authentication**.
3. Open **Providers**.
4. Open **Email**.
5. Keep **Email provider** enabled.
6. Disable **Confirm email**.
7. Do not enable Google, GitHub, Apple, or other OAuth providers for the first version.
8. Save changes.

## Create Workouts Table

1. Go to **SQL Editor**.
2. Click **New query**.
3. Open `supabase/workouts.sql` from this repository.
4. Paste the whole file into the SQL editor.
5. Click **Run**.
6. Confirm that the query succeeds.

The SQL enables RLS and creates policies that allow authenticated users to read, insert, and update only their own workout rows.

## Get App Keys

1. Go to **Project Settings**.
2. Open **API Keys** or **API**.
3. Copy the **Project URL**.
4. Copy a client-side public key:
   - New Supabase projects may show a **Publishable key**.
   - Older projects may show a legacy **anon public** key.
5. Do not copy `service_role`, `sb_secret_...`, or any secret key into this Vite app.

Create `.env.local` in the repository root:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Restart the dev server after adding `.env.local`.

## Send These Values To The App

When implementation or testing needs real cloud sync, provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No database password or secret/service-role key is needed by the browser app.
