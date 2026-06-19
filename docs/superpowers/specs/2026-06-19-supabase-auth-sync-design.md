# Supabase Auth And Workout Sync Design

## Goal

Add optional Supabase email/password accounts and cloud workout synchronization while preserving the current offline-first IndexedDB behavior. The app must remain fully usable without an account and without network access.

## User Decisions

- Use Supabase with email/password only.
- Do not require email confirmation.
- Supabase project does not exist yet, so setup instructions must cover project creation, Auth settings, table schema, indexes, and RLS policies.
- Keep the existing local workout history.
- When a guest user signs in, attach guest workouts to that account and upload them.
- Support two-way sync across devices.
- If the same workout changes on multiple devices, the newest `updatedAt` wins.
- Deletions sync through soft delete using `deletedAt`.
- Add a dedicated Account screen and a fourth bottom tab.
- Show simple sync status: synced, pending changes, syncing, sync error, offline.
- No manual "sync now" button in the first version.
- Logout keeps local workouts on the device.
- If a different account signs in later, do not upload workouts already attached to another account.
- Password reset is out of scope for the first version.

## Current App Context

The app stores completed workouts in Dexie `workouts` and reads them through `dexie-react-hooks`. Existing routes use local numeric workout IDs, including `/workouts/$workoutId`. The live workout flow saves completed workouts through `addWorkout()`. The UI is localized through `src/i18n/{ru,uk,en}.ts`, and the bottom tabs live in `src/ui/TabBar.tsx`.

This design keeps Dexie as the source of truth for screens. Supabase is an optional remote replica used only when a session exists and the browser is online.

## Supabase Setup

Create a Supabase project and configure Auth:

- Enable Email provider.
- Disable "Confirm email" so sign up creates an active session immediately.
- Do not enable Google or other OAuth providers.
- Use a Vite public environment file:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

Create a `workouts` table in the `public` schema:

```sql
create table public.workouts (
  client_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  workout_time text not null,
  seconds integer not null check (seconds >= 0),
  km double precision not null check (km >= 0),
  kcal double precision not null check (kcal >= 0),
  minutes double precision not null check (minutes >= 0),
  steps integer not null check (steps >= 0),
  max_speed double precision not null check (max_speed >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz null
);

create index workouts_user_updated_idx on public.workouts (user_id, updated_at);
create index workouts_user_deleted_idx on public.workouts (user_id, deleted_at);

alter table public.workouts enable row level security;

create policy "Users can read their workouts"
on public.workouts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their workouts"
on public.workouts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their workouts"
on public.workouts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

No delete policy is required in the first version because the app uses soft deletes.

## Local Data Model

Keep the existing `Workout` fields and add sync metadata:

```ts
export type SyncStatus = 'local' | 'pending' | 'syncing' | 'synced' | 'error';

export type Workout = {
  id: number;
  clientId: string;
  ownerUserId: string | null;
  date: string;
  time: string;
  seconds: number;
  km: number;
  kcal: number;
  min: number;
  steps: number;
  maxSpeed: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastSyncError?: string;
};
```

Dexie migration to version 2 must preserve existing records. During upgrade, each legacy workout receives a generated `clientId`, `ownerUserId: null`, timestamps, `deletedAt: null`, and `syncStatus: 'local'`. Existing numeric `id` stays local so routes and screens do not break.

Queries that feed visible history, stats, export, and detail screens exclude records with `deletedAt !== null`.

## Sync Behavior

Sync triggers:

- after a successful sign up or sign in,
- when Supabase auth state changes to signed in,
- when `window` fires `online`,
- after saving or deleting a workout while signed in.

Sync is skipped when:

- no Supabase session exists,
- `navigator.onLine === false`,
- required Supabase env variables are absent.

Sync runs in this order:

1. Get the current Supabase user ID.
2. Attach local guest workouts (`ownerUserId === null`) to the current user and mark them `pending`.
3. Pull remote workouts for the current user.
4. Merge remote records into Dexie by `clientId`.
5. Push local records for the current user with `syncStatus` of `local`, `pending`, or `error`.
6. Mark successfully pushed records `synced`.
7. Surface aggregate state to the Account screen.

Different-account behavior:

- Workouts with `ownerUserId` equal to another user are never pushed to the current account.
- They can remain visible locally after logout because logout does not clear IndexedDB.
- If stronger privacy is needed later, add a logout option to clear account data from the device.

## Conflict Rules

Conflict identity is `clientId`.

If both local and remote records exist:

- Compare `updatedAt`.
- The newer record wins.
- If the winner has `deletedAt`, the workout remains hidden locally and remote keeps the tombstone.
- If timestamps are equal, keep the local record to avoid UI churn.

Deletes are local updates:

- Set `deletedAt` to the current ISO timestamp.
- Set `updatedAt` to the same timestamp.
- Set `syncStatus` to `pending` when signed in, otherwise `local`.
- Keep the record in Dexie for sync; hide it from normal reads.

## Account UI

Add `/account` route and a fourth bottom tab with a user icon.

Account states:

- Signed out: email field, password field, sign in button, create account button, and offline-friendly text that accounts are optional.
- Signed in: show email, sign out button, and simple sync status.
- Auth loading: disable buttons and show a compact loading state.

Sync status labels:

- `synced`: all current-user local changes are uploaded.
- `pending`: N local changes are waiting for connectivity or sync.
- `syncing`: sync is running.
- `error`: the last sync attempt failed.
- `offline`: browser is offline.

All labels must be added to `ru`, `uk`, and `en`.

## Error Handling

Auth errors are shown inline on the Account screen. Sync errors do not block workout recording. Failed sync attempts set `syncStatus: 'error'` for affected records and store a short `lastSyncError`. The Account screen shows the aggregate error status. The next automatic trigger retries errored records.

If Supabase env variables are missing, the app still runs offline. The Account screen shows that cloud sync is not configured.

## Testing

Add focused Vitest coverage for:

- Dexie v1-to-v2 migration preserves legacy workouts.
- Repository reads exclude soft-deleted records.
- Delete marks a workout as deleted instead of removing it.
- Sync merge uses newest `updatedAt`.
- Guest workouts attach to the current user on sign in.
- Workouts owned by another user are not pushed to the current account.
- Account screen signed-out, signed-in, offline, pending, syncing, and error states.

Run the required checks before considering implementation complete:

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

## Out Of Scope

- Password reset.
- Email confirmation flow.
- OAuth providers.
- Manual "sync now" button.
- Server-side conflict UI.
- Clearing local data on logout.
- Supabase Realtime subscriptions.

## Source Notes

Supabase password auth supports email/password sign up and sign in through `signUp()` and `signInWithPassword()`. Hosted Supabase projects enable email confirmation by default, so the project must explicitly disable confirmation for this first version. Supabase RLS is the boundary that protects browser-originated database access; policies use `auth.uid()` to limit rows to the current user.
