# Supabase Auth And Workout Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Supabase email/password accounts and automatic workout sync without breaking existing offline Dexie history.

**Architecture:** Dexie remains the local source of truth for all screens. Supabase is an optional remote replica reached through a small auth client and a sync service that pushes and pulls workout rows by stable `clientId`.

**Tech Stack:** React, TypeScript, Vite, Dexie, Zustand, TanStack Router, Supabase JS, Vitest, Testing Library, fake-indexeddb, Playwright.

---

## File Structure

- Create: `supabase/workouts.sql` - SQL schema, indexes, and RLS policies for manual Supabase project setup.
- Create: `.env.example` - public Vite Supabase env variable names.
- Modify: `package.json` and `package-lock.json` - add `@supabase/supabase-js`.
- Modify: `src/domain/workout.ts` - add sync metadata types and helpers.
- Create: `src/domain/sync.ts` - pure conflict and status helpers.
- Create: `src/domain/sync.test.ts` - pure sync merge tests.
- Modify: `src/db/app-db.ts` - Dexie version 2 schema and migration.
- Modify: `src/db/workout-repository.ts` - soft delete, sync-aware add/update helpers, visible read filters.
- Modify: `src/db/workout-repository.test.ts` - migration, soft delete, visible read tests.
- Modify: `src/db/workout-live-queries.ts` - filter out soft-deleted workouts.
- Create: `src/features/auth/supabase-client.ts` - Supabase client factory and configuration guard.
- Create: `src/features/auth/auth-store.ts` - session/user runtime state.
- Create: `src/features/auth/auth-service.ts` - sign up, sign in, sign out, session loading.
- Create: `src/features/auth/auth-service.test.ts` - auth behavior with mocked Supabase client.
- Create: `src/features/sync/workout-sync.ts` - pull, merge, push, and status aggregation.
- Create: `src/features/sync/workout-sync.test.ts` - sync behavior with mocked remote API and fake IndexedDB.
- Create: `src/features/sync/use-workout-sync.ts` - React effect wiring auth state, online events, and local triggers.
- Create: `src/features/account/AccountScreen.tsx` - account form, signed-in state, sync status.
- Create: `src/features/account/AccountScreen.test.tsx` - account UI tests.
- Modify: `src/app/router.tsx` - add `/account`.
- Modify: `src/app/app-store.ts` - add `account` screen.
- Modify: `src/App.tsx` - initialize auth and sync hooks.
- Modify: `src/ui/TabBar.tsx` - add account tab.
- Modify: `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/en.ts` - add account and sync labels.
- Modify: `docs/ARCHITECTURE.md` - document Supabase optional sync.
- Modify: `tests/workout-flow.spec.ts` - cover account tab remains available and offline workout flow still works.

## Task 1: Install Supabase Dependency And Document Project Setup

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.env.example`
- Create: `supabase/workouts.sql`

- [ ] **Step 1: Install dependency**

Run:

```bash
npm install @supabase/supabase-js
```

Expected: `package.json` contains `@supabase/supabase-js` and `package-lock.json` is updated.

- [ ] **Step 2: Add environment example**

Create `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

- [ ] **Step 3: Add Supabase SQL setup**

Create `supabase/workouts.sql`:

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

- [ ] **Step 4: Verify install**

Run:

```bash
npm run build
```

Expected: build succeeds before functional changes begin.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example supabase/workouts.sql
git commit -m "chore: add supabase setup"
```

## Task 2: Extend Workout Domain Model And Add Pure Sync Helpers

**Files:**
- Modify: `src/domain/workout.ts`
- Create: `src/domain/sync.ts`
- Create: `src/domain/sync.test.ts`

- [ ] **Step 1: Add failing sync tests**

Create `src/domain/sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Workout } from './workout';
import { chooseNewestWorkout, syncStatusFromCounts } from './sync';

const baseWorkout: Workout = {
  id: 1,
  clientId: '11111111-1111-4111-8111-111111111111',
  ownerUserId: 'user-a',
  date: '2026-06-19',
  time: '08:30',
  seconds: 600,
  km: 1,
  kcal: 60,
  min: 10,
  steps: 1200,
  maxSpeed: 6,
  createdAt: '2026-06-19T08:30:00.000Z',
  updatedAt: '2026-06-19T08:30:00.000Z',
  deletedAt: null,
  syncStatus: 'synced',
};

describe('sync domain helpers', () => {
  it('keeps the newer workout by updatedAt', () => {
    const local = { ...baseWorkout, kcal: 60, updatedAt: '2026-06-19T08:30:00.000Z' };
    const remote = { ...baseWorkout, kcal: 70, updatedAt: '2026-06-19T08:31:00.000Z' };

    expect(chooseNewestWorkout(local, remote)).toEqual(remote);
  });

  it('keeps local workout when timestamps match', () => {
    const local = { ...baseWorkout, kcal: 60 };
    const remote = { ...baseWorkout, kcal: 70 };

    expect(chooseNewestWorkout(local, remote)).toEqual(local);
  });

  it('reports simple aggregate sync status', () => {
    expect(syncStatusFromCounts({ isOnline: false, isSyncing: false, pending: 0, errors: 0 })).toBe('offline');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: true, pending: 2, errors: 0 })).toBe('syncing');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: false, pending: 0, errors: 1 })).toBe('error');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: false, pending: 3, errors: 0 })).toBe('pending');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: false, pending: 0, errors: 0 })).toBe('synced');
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/domain/sync.test.ts
```

Expected: fail because `src/domain/sync.ts` does not exist and `Workout` lacks sync fields.

- [ ] **Step 3: Extend workout types**

Update `src/domain/workout.ts` with these exports while preserving existing formatter functions:

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

- [ ] **Step 4: Add sync helpers**

Create `src/domain/sync.ts`:

```ts
import type { Workout } from './workout';

export type SyncAggregateStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

export function chooseNewestWorkout(local: Workout, remote: Workout): Workout {
  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);
  return remoteTime > localTime ? remote : local;
}

export function syncStatusFromCounts({
  isOnline,
  isSyncing,
  pending,
  errors,
}: {
  isOnline: boolean;
  isSyncing: boolean;
  pending: number;
  errors: number;
}): SyncAggregateStatus {
  if (!isOnline) return 'offline';
  if (isSyncing) return 'syncing';
  if (errors > 0) return 'error';
  if (pending > 0) return 'pending';
  return 'synced';
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- src/domain/sync.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/workout.ts src/domain/sync.ts src/domain/sync.test.ts
git commit -m "feat: add workout sync domain model"
```

## Task 3: Migrate Dexie Without Losing Existing History

**Files:**
- Modify: `src/db/app-db.ts`
- Modify: `src/db/workout-repository.test.ts`
- Modify: existing tests that create `Workout` objects

- [ ] **Step 1: Add test helpers for synced workouts**

In tests that construct workouts, use a local helper like:

```ts
function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 100,
    clientId: '11111111-1111-4111-8111-111111111111',
    ownerUserId: null,
    date: '2026-06-13',
    time: '08:30',
    seconds: 600,
    min: 10,
    km: 1,
    kcal: 65,
    steps: 1200,
    maxSpeed: 6,
    createdAt: '2026-06-13T08:30:00.000Z',
    updatedAt: '2026-06-13T08:30:00.000Z',
    deletedAt: null,
    syncStatus: 'local',
    ...overrides,
  };
}
```

- [ ] **Step 2: Add migration preservation test**

Add to `src/db/workout-repository.test.ts`:

```ts
it('preserves legacy workouts and adds sync metadata', async () => {
  await db.workouts.put({
    id: 777,
    date: '2026-06-01',
    time: '07:15',
    seconds: 900,
    min: 15,
    km: 1.5,
    kcal: 90,
    steps: 1800,
    maxSpeed: 6.5,
  } as Workout);

  const saved = await getWorkout(777);

  expect(saved).toMatchObject({
    id: 777,
    date: '2026-06-01',
    ownerUserId: null,
    deletedAt: null,
    syncStatus: 'local',
  });
  expect(saved?.clientId).toMatch(/[0-9a-f-]{36}/);
  expect(new Date(saved?.createdAt ?? '').toString()).not.toBe('Invalid Date');
  expect(new Date(saved?.updatedAt ?? '').toString()).not.toBe('Invalid Date');
});
```

- [ ] **Step 3: Run failing repository tests**

Run:

```bash
npm run test -- src/db/workout-repository.test.ts
```

Expected: fail because metadata is not filled.

- [ ] **Step 4: Add Dexie version 2 schema and hook**

Update `src/db/app-db.ts`:

```ts
import Dexie, { type Table } from 'dexie';
import type { Workout } from '../domain/workout';

function normalizeWorkoutForLocalStorage(workout: Partial<Workout>): Workout {
  const now = new Date().toISOString();
  return {
    id: Number(workout.id),
    clientId: workout.clientId ?? crypto.randomUUID(),
    ownerUserId: workout.ownerUserId ?? null,
    date: workout.date ?? '',
    time: workout.time ?? '',
    seconds: workout.seconds ?? 0,
    km: workout.km ?? 0,
    kcal: workout.kcal ?? 0,
    min: workout.min ?? 0,
    steps: workout.steps ?? 0,
    maxSpeed: workout.maxSpeed ?? 0,
    createdAt: workout.createdAt ?? now,
    updatedAt: workout.updatedAt ?? now,
    deletedAt: workout.deletedAt ?? null,
    syncStatus: workout.syncStatus ?? 'local',
    lastSyncError: workout.lastSyncError,
  };
}

export class AppDb extends Dexie {
  workouts!: Table<Workout, number>;

  constructor() {
    super('treadmill-workout-db');
    this.version(1).stores({
      workouts: 'id, date',
    });
    this.version(2)
      .stores({
        workouts: 'id, clientId, ownerUserId, date, updatedAt, deletedAt, syncStatus',
      })
      .upgrade(async (transaction) => {
        await transaction.table<Workout, number>('workouts').toCollection().modify((workout) => {
          Object.assign(workout, normalizeWorkoutForLocalStorage(workout));
        });
      });
    this.workouts.hook('creating', (_primaryKey, workout) => {
      Object.assign(workout, normalizeWorkoutForLocalStorage(workout));
    });
    this.workouts.hook('updating', (mods) => {
      if (!('updatedAt' in mods)) {
        mods.updatedAt = new Date().toISOString();
      }
      return mods;
    });
  }
}

export const db = new AppDb();
```

- [ ] **Step 5: Run repository tests**

Run:

```bash
npm run test -- src/db/workout-repository.test.ts
```

Expected: pass after test fixtures are updated with sync metadata.

- [ ] **Step 6: Commit**

```bash
git add src/db/app-db.ts src/db/workout-repository.test.ts src/**/*.test.ts src/**/*.test.tsx
git commit -m "feat: migrate workouts for sync metadata"
```

## Task 4: Make Repository Sync-Aware And Preserve Soft Deletes

**Files:**
- Modify: `src/db/workout-repository.ts`
- Modify: `src/db/workout-live-queries.ts`
- Modify: `src/db/workout-repository.test.ts`

- [ ] **Step 1: Add soft-delete tests**

Add tests:

```ts
it('hides soft-deleted workouts from visible reads', async () => {
  await addWorkout(makeWorkout({ id: 100, deletedAt: null }));
  await addWorkout(makeWorkout({ id: 101, clientId: '22222222-2222-4222-8222-222222222222', deletedAt: '2026-06-14T08:30:00.000Z' }));

  expect((await listWorkouts()).map((item) => item.id)).toEqual([100]);
});

it('soft deletes workouts instead of removing them', async () => {
  await addWorkout(makeWorkout({ id: 100, ownerUserId: 'user-a', syncStatus: 'synced' }));

  await deleteWorkout(100);
  const saved = await db.workouts.get(100);

  expect(saved?.deletedAt).toBeTruthy();
  expect(saved?.syncStatus).toBe('pending');
  expect(await getWorkout(100)).toBeUndefined();
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/db/workout-repository.test.ts
```

Expected: fail because delete physically removes records.

- [ ] **Step 3: Update repository**

Change `src/db/workout-repository.ts`:

```ts
import { createExportPayload, type WorkoutExportPayload } from '../domain/export';
import type { Workout } from '../domain/workout';
import { db } from './app-db';

function visible(workouts: Workout[]): Workout[] {
  return workouts.filter((workout) => !workout.deletedAt);
}

export async function listWorkouts(): Promise<Workout[]> {
  const workouts = visible(await db.workouts.orderBy('date').reverse().toArray());
  return workouts.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export async function getWorkout(id: number): Promise<Workout | undefined> {
  const workout = await db.workouts.get(id);
  return workout?.deletedAt ? undefined : workout;
}

export async function addWorkout(workout: Workout): Promise<number> {
  return db.workouts.put({ ...workout, syncStatus: workout.ownerUserId ? 'pending' : workout.syncStatus });
}

export async function deleteWorkout(id: number): Promise<void> {
  const workout = await db.workouts.get(id);
  if (!workout) return;
  const deletedAt = new Date().toISOString();
  await db.workouts.put({
    ...workout,
    deletedAt,
    updatedAt: deletedAt,
    syncStatus: workout.ownerUserId ? 'pending' : 'local',
  });
}

export async function bulkPutWorkouts(workouts: Workout[]): Promise<number> {
  return db.workouts.bulkPut(workouts);
}

export async function exportWorkouts(): Promise<Workout[]> {
  return listWorkouts();
}

export async function createWorkoutExportPayload(): Promise<WorkoutExportPayload> {
  return createExportPayload(await exportWorkouts());
}
```

- [ ] **Step 4: Update live queries**

Update `src/db/workout-live-queries.ts` so all returned collections filter `!workout.deletedAt`, and `useWorkout()` returns `undefined` for deleted records.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test -- src/db/workout-repository.test.ts src/features/workouts/WorkoutDetailScreen.test.tsx src/features/workouts/HistoryScreen.test.tsx src/features/home/HomeScreen.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/db/workout-repository.ts src/db/workout-live-queries.ts src/db/workout-repository.test.ts src/features
git commit -m "feat: support workout soft deletes"
```

## Task 5: Add Supabase Auth Client And Store

**Files:**
- Create: `src/features/auth/supabase-client.ts`
- Create: `src/features/auth/auth-store.ts`
- Create: `src/features/auth/auth-service.ts`
- Create: `src/features/auth/auth-service.test.ts`

- [ ] **Step 1: Add auth service tests with a mocked client**

Create tests that verify:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthService } from './auth-service';

describe('auth service', () => {
  const client = {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current session', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a', email: 'a@example.com' } } }, error: null });
    const service = createAuthService(client);

    await expect(service.loadSession()).resolves.toEqual({ userId: 'user-a', email: 'a@example.com' });
  });

  it('signs in with email and password', async () => {
    client.auth.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: 'user-a', email: 'a@example.com' } } },
      error: null,
    });
    const service = createAuthService(client);

    await expect(service.signIn('a@example.com', 'password123')).resolves.toEqual({ userId: 'user-a', email: 'a@example.com' });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' });
  });

  it('signs up with email and password', async () => {
    client.auth.signUp.mockResolvedValue({
      data: { session: { user: { id: 'user-a', email: 'a@example.com' } } },
      error: null,
    });
    const service = createAuthService(client);

    await expect(service.signUp('a@example.com', 'password123')).resolves.toEqual({ userId: 'user-a', email: 'a@example.com' });
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/features/auth/auth-service.test.ts
```

Expected: fail because auth files do not exist.

- [ ] **Step 3: Create Supabase client guard**

Create `src/features/auth/supabase-client.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured && supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
```

- [ ] **Step 4: Create auth store**

Create `src/features/auth/auth-store.ts`:

```ts
import { create } from 'zustand';

export type AuthUser = {
  userId: string;
  email: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

- [ ] **Step 5: Create auth service**

Create `src/features/auth/auth-service.ts` with `createAuthService(client)` exposing `loadSession`, `signIn`, `signUp`, `signOut`, and `onAuthStateChange`. Normalize Supabase user data to `{ userId, email }` and throw `Error(error.message)` when Supabase returns an error.

- [ ] **Step 6: Run auth tests**

Run:

```bash
npm run test -- src/features/auth/auth-service.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/auth
git commit -m "feat: add supabase auth service"
```

## Task 6: Implement Workout Sync Service

**Files:**
- Create: `src/features/sync/workout-sync.ts`
- Create: `src/features/sync/workout-sync.test.ts`
- Modify: `src/db/workout-repository.ts`

- [ ] **Step 1: Add sync service tests**

Create tests for:

```ts
it('attaches guest workouts to the current user before push', async () => {
  await addWorkout(makeWorkout({ id: 1, ownerUserId: null, syncStatus: 'local' }));
  await syncWorkouts({ userId: 'user-a', remote: fakeRemote });
  expect((await db.workouts.get(1))?.ownerUserId).toBe('user-a');
});

it('does not push workouts owned by a different user', async () => {
  await addWorkout(makeWorkout({ id: 1, ownerUserId: 'user-b', syncStatus: 'pending' }));
  await syncWorkouts({ userId: 'user-a', remote: fakeRemote });
  expect(fakeRemote.upsertWorkouts).not.toHaveBeenCalled();
});

it('pulls newer remote workouts into Dexie', async () => {
  await addWorkout(makeWorkout({ id: 1, clientId: '11111111-1111-4111-8111-111111111111', ownerUserId: 'user-a', updatedAt: '2026-06-19T08:30:00.000Z', kcal: 60 }));
  fakeRemote.listWorkouts.mockResolvedValue([
    makeWorkout({ id: 999, clientId: '11111111-1111-4111-8111-111111111111', ownerUserId: 'user-a', updatedAt: '2026-06-19T08:31:00.000Z', kcal: 70 }),
  ]);
  await syncWorkouts({ userId: 'user-a', remote: fakeRemote });
  expect((await db.workouts.get(1))?.kcal).toBe(70);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/features/sync/workout-sync.test.ts
```

Expected: fail because sync service does not exist.

- [ ] **Step 3: Add repository helpers**

Add repository functions:

```ts
export async function listAllWorkoutsIncludingDeleted(): Promise<Workout[]> {
  return db.workouts.toArray();
}

export async function listWorkoutsForSync(userId: string): Promise<Workout[]> {
  return db.workouts
    .filter((workout) => workout.ownerUserId === userId && ['local', 'pending', 'error'].includes(workout.syncStatus))
    .toArray();
}

export async function attachGuestWorkoutsToUser(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.workouts
    .filter((workout) => workout.ownerUserId === null)
    .modify((workout) => {
      workout.ownerUserId = userId;
      workout.updatedAt = now;
      workout.syncStatus = 'pending';
    });
}
```

- [ ] **Step 4: Add sync service**

Create `src/features/sync/workout-sync.ts` with:

```ts
export type RemoteWorkoutApi = {
  listWorkouts: (userId: string) => Promise<Workout[]>;
  upsertWorkouts: (workouts: Workout[]) => Promise<void>;
};

export async function syncWorkouts({ userId, remote }: { userId: string; remote: RemoteWorkoutApi }): Promise<void> {
  await attachGuestWorkoutsToUser(userId);
  const remoteWorkouts = await remote.listWorkouts(userId);
  const localWorkouts = await listAllWorkoutsIncludingDeleted();
  const localByClientId = new Map(localWorkouts.map((workout) => [workout.clientId, workout]));

  for (const remoteWorkout of remoteWorkouts) {
    const local = localByClientId.get(remoteWorkout.clientId);
    if (!local) {
      await bulkPutWorkouts([{ ...remoteWorkout, syncStatus: 'synced' }]);
      continue;
    }
    const winner = chooseNewestWorkout(local, remoteWorkout);
    await bulkPutWorkouts([{ ...winner, id: local.id, syncStatus: 'synced' }]);
  }

  const pending = await listWorkoutsForSync(userId);
  if (!pending.length) return;
  await remote.upsertWorkouts(pending);
  await bulkPutWorkouts(pending.map((workout) => ({ ...workout, syncStatus: 'synced', lastSyncError: undefined })));
}
```

- [ ] **Step 5: Run sync tests**

Run:

```bash
npm run test -- src/features/sync/workout-sync.test.ts src/db/workout-repository.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/sync src/db/workout-repository.ts src/db/workout-repository.test.ts
git commit -m "feat: add workout sync service"
```

## Task 7: Connect Supabase Remote API

**Files:**
- Modify: `src/features/sync/workout-sync.ts`
- Create: `src/features/sync/supabase-workout-api.ts`
- Create: `src/features/sync/supabase-workout-api.test.ts`

- [ ] **Step 1: Add mapping tests**

Test local-to-remote and remote-to-local field names:

```ts
expect(toRemoteWorkout(makeWorkout({ ownerUserId: 'user-a' }))).toMatchObject({
  client_id: '11111111-1111-4111-8111-111111111111',
  user_id: 'user-a',
  workout_date: '2026-06-13',
  workout_time: '08:30',
  minutes: 10,
  max_speed: 6,
});
```

- [ ] **Step 2: Run failing mapping tests**

Run:

```bash
npm run test -- src/features/sync/supabase-workout-api.test.ts
```

Expected: fail because file does not exist.

- [ ] **Step 3: Add Supabase remote adapter**

Create `src/features/sync/supabase-workout-api.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workout } from '../../domain/workout';
import type { RemoteWorkoutApi } from './workout-sync';

export type RemoteWorkoutRow = {
  client_id: string;
  user_id: string;
  workout_date: string;
  workout_time: string;
  seconds: number;
  km: number;
  kcal: number;
  minutes: number;
  steps: number;
  max_speed: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function toRemoteWorkout(workout: Workout): RemoteWorkoutRow {
  if (!workout.ownerUserId) {
    throw new Error('Cannot map workout without ownerUserId');
  }

  return {
    client_id: workout.clientId,
    user_id: workout.ownerUserId,
    workout_date: workout.date,
    workout_time: workout.time,
    seconds: workout.seconds,
    km: workout.km,
    kcal: workout.kcal,
    minutes: workout.min,
    steps: workout.steps,
    max_speed: workout.maxSpeed,
    created_at: workout.createdAt,
    updated_at: workout.updatedAt,
    deleted_at: workout.deletedAt,
  };
}

export function fromRemoteWorkout(row: RemoteWorkoutRow): Workout {
  return {
    id: 0,
    clientId: row.client_id,
    ownerUserId: row.user_id,
    date: row.workout_date,
    time: row.workout_time,
    seconds: row.seconds,
    km: row.km,
    kcal: row.kcal,
    min: row.minutes,
    steps: row.steps,
    maxSpeed: row.max_speed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: 'synced',
  };
}

export function createSupabaseWorkoutApi(client: SupabaseClient): RemoteWorkoutApi {
  return {
    async listWorkouts(userId) {
      const { data, error } = await client.from('workouts').select('*').eq('user_id', userId);
      if (error) throw new Error(error.message);
      return (data as RemoteWorkoutRow[]).map(fromRemoteWorkout);
    },
    async upsertWorkouts(workouts) {
      const rows = workouts.map(toRemoteWorkout);
      const { error } = await client.from('workouts').upsert(rows, { onConflict: 'client_id' });
      if (error) throw new Error(error.message);
    },
  };
}
```

The adapter must:

- select rows from `workouts` where `user_id` equals the current user,
- upsert rows on `client_id`,
- map `min` to `minutes`,
- map `date` to `workout_date`,
- map `time` to `workout_time`,
- map `maxSpeed` to `max_speed`.

- [ ] **Step 4: Run mapping tests**

Run:

```bash
npm run test -- src/features/sync/supabase-workout-api.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/sync/supabase-workout-api.ts src/features/sync/supabase-workout-api.test.ts
git commit -m "feat: add supabase workout adapter"
```

## Task 8: Wire Auth And Automatic Sync Into The App

**Files:**
- Create: `src/features/sync/use-workout-sync.ts`
- Modify: `src/App.tsx`
- Modify: `src/features/live/live-store.ts`
- Modify: `src/features/workouts/WorkoutDetailScreen.tsx`

- [ ] **Step 1: Add hook tests**

Test that `online` triggers sync when signed in and no-op when signed out.

- [ ] **Step 2: Implement `useWorkoutSync()`**

The hook:

- loads the current session once,
- subscribes to auth state changes,
- calls `syncWorkouts()` after sign in,
- listens to `window.online`,
- exposes aggregate sync status through a sync Zustand store,
- skips sync when Supabase is unconfigured, signed out, or offline.

- [ ] **Step 3: Call hook from app shell**

In `src/App.tsx`, call `useWorkoutSync()` near the existing restore and URL sync effects.

- [ ] **Step 4: Trigger sync after local save and delete**

After `addWorkout()` in `stopAndSave()` and after `deleteWorkout()` in `WorkoutDetailScreen`, notify the sync store that local changes exist. The hook reacts to this counter and attempts sync if signed in and online.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test -- src/features/sync src/features/live/live-store.test.ts src/features/workouts/WorkoutDetailScreen.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/sync src/App.tsx src/features/live/live-store.ts src/features/workouts/WorkoutDetailScreen.tsx
git commit -m "feat: run workout sync automatically"
```

## Task 9: Add Account Route, Tab, UI, And Translations

**Files:**
- Create: `src/features/account/AccountScreen.tsx`
- Create: `src/features/account/AccountScreen.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/app/app-store.ts`
- Modify: `src/ui/TabBar.tsx`
- Modify: `src/i18n/ru.ts`
- Modify: `src/i18n/uk.ts`
- Modify: `src/i18n/en.ts`

- [ ] **Step 1: Add account UI tests**

Cover:

- signed out form,
- successful sign in calls auth service,
- successful sign up calls auth service,
- signed in email and logout,
- configured-missing message,
- simple sync statuses.

- [ ] **Step 2: Run failing account tests**

Run:

```bash
npm run test -- src/features/account/AccountScreen.test.tsx
```

Expected: fail because screen does not exist.

- [ ] **Step 3: Add route and screen state**

Add `account` to `ScreenName`, update `screenFromPath('/account')`, and add route:

```ts
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  component: AccountScreen,
});
```

- [ ] **Step 4: Add tab**

Use `User` from `lucide-react` and add:

```ts
{ screen: 'account', label: t.nav.account, Icon: User, path: '/account' }
```

- [ ] **Step 5: Add translations**

Add `nav.account` and an `account` translation group in all locales with labels for email, password, sign in, create account, sign out, optional account text, unconfigured sync, loading, and the five sync statuses.

- [ ] **Step 6: Implement AccountScreen**

Use existing dark mobile Tailwind patterns. Keep the form compact:

- email input,
- password input,
- primary sign in button,
- secondary create account button,
- inline error text,
- signed-in email and sign out button,
- sync status line.

- [ ] **Step 7: Run account tests**

Run:

```bash
npm run test -- src/features/account/AccountScreen.test.tsx src/App.test.tsx
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/account src/app/router.tsx src/app/app-store.ts src/App.tsx src/ui/TabBar.tsx src/i18n
git commit -m "feat: add account screen"
```

## Task 10: Update Architecture Docs And E2E Smoke Coverage

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `tests/workout-flow.spec.ts`

- [ ] **Step 1: Update docs**

Add sections:

- Supabase is optional.
- Dexie remains source of truth.
- Workouts sync by `clientId`.
- Soft deletes use `deletedAt`.
- Logout keeps local data.
- Different-account records are not uploaded to the current account.

- [ ] **Step 2: Update Playwright smoke**

Add a lightweight assertion that the Account tab exists and opening it does not block the offline workout flow.

- [ ] **Step 3: Run e2e**

Run:

```bash
npm run test:e2e
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md tests/workout-flow.spec.ts
git commit -m "test: cover account tab in workout flow"
```

## Task 11: Final Verification

**Files:** all changed files.

- [ ] **Step 1: Run unit and component tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 4: Run e2e**

```bash
npm run test:e2e
```

Expected: Playwright smoke passes.

- [ ] **Step 5: Manual browser check**

Run:

```bash
npm run dev
```

Open the shown local URL and verify:

- app loads without `.env`,
- Account tab shows cloud sync is not configured,
- existing local workouts remain visible,
- creating a new workout still works offline,
- after adding `.env`, account sign up and sign in are available.

- [ ] **Step 6: Commit final fixes**

```bash
git add .
git commit -m "feat: add supabase auth and workout sync"
```

## Supabase Console Checklist

Before testing against a real project:

- Create Supabase project.
- Open Authentication > Providers > Email.
- Keep Email provider enabled.
- Disable Confirm email.
- Do not enable OAuth providers.
- Copy project URL and anon/publishable key into `.env.local`.
- Run `supabase/workouts.sql` in SQL Editor.
- Confirm RLS is enabled on `public.workouts`.

## Self-Review Notes

- Existing workout history is preserved by Dexie v2 migration and by keeping numeric `id`.
- Offline use remains available because all screens read from Dexie.
- Sync cannot upload another user's workouts because `listWorkoutsForSync(userId)` filters by `ownerUserId`.
- Soft deletes are hidden locally but retained until pushed.
- Password reset and email confirmation are intentionally absent from the first version.
