# React Vite Dexie Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace the static `index.html` treadmill PWA with a React/Vite/TypeScript app that stores workouts in Dexie and supports offline-first JSON export.

**Architecture:** Build a Vite React app with focused modules for domain calculations, persistence, runtime app state, Bluetooth, screens, PWA setup, and export. Dexie is the source of truth for completed workouts, Zustand holds live UI state, and domain logic stays framework-independent for tests.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, Dexie, dexie-react-hooks, Zustand, @js-temporal/polyfill, vite-plugin-pwa, lucide-react, Vitest, Testing Library, fake-indexeddb, Playwright.

**Status:** Implemented and merged as of 2026-06-15. Checkboxes below are marked complete because the current repository contains the migrated app, tests, PWA build output, and Playwright smoke coverage. This plan is now an implementation record, not an open task list.

**Current implementation notes:**

- URL-backed navigation uses `@tanstack/react-router` in `src/app/router.tsx`; the original "no TanStack Query" constraint still applies and does not prohibit TanStack Router.
- i18n was added after the first migration plan with `ru`, `uk`, and `en` translations under `src/i18n/`.
- Live workout state is persisted in `localStorage` under `walking-app-active-workout` so reloads can restore workout metrics before the user reconnects Bluetooth.
- FTMS control-point support sends start/stop/speed commands when available and gracefully degrades when the treadmill does not expose the characteristic.
- The detail screen now supports deleting a saved workout after confirmation.
- ESLint and Prettier configs are part of the delivered tooling.

---

## File Structure

Create or modify:

- `package.json`: npm scripts and dependencies.
- `index.html`: Vite HTML entry with `<div id="root"></div>`.
- `vite.config.ts`: React, Tailwind, Vitest, and PWA config.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript config.
- `src/main.tsx`: React entry.
- `src/index.css`: Tailwind entry and global mobile styles.
- `src/vite-env.d.ts`: Vite and Web Bluetooth declarations.
- `src/app/router.tsx`: TanStack Router route tree.
- `src/domain/workout.ts`: workout types and summary helpers.
- `src/domain/date-time.ts`: Temporal and Intl date helpers.
- `src/domain/stats.ts`: period filtering and aggregate calculations.
- `src/domain/export.ts`: export payload creation.
- `src/db/app-db.ts`: Dexie database.
- `src/db/workout-repository.ts`: persistence and legacy migration.
- `src/app/app-store.ts`: Zustand runtime state.
- `src/App.tsx`: top-level app shell.
- `src/features/bluetooth/ftms.ts`: FTMS constants, parsing, and connection helpers.
- `src/features/live/live-store.ts`: live workout state and actions.
- `src/features/live/LiveScreen.tsx`: active workout screen.
- `src/features/home/HomeScreen.tsx`: home and daily totals.
- `src/features/stats/StatsScreen.tsx`: stats screen.
- `src/features/workouts/HistoryScreen.tsx`: workout history.
- `src/features/workouts/WorkoutDetailScreen.tsx`: workout detail.
- `src/features/export/ExportButton.tsx`: JSON export button.
- `src/ui/Toast.tsx`, `src/ui/TabBar.tsx`, `src/ui/TreadmillArt.tsx`: shared UI.
- `src/test/setup.ts`: Vitest setup for DOM and fake IndexedDB.
- `src/**/*.test.ts`, `src/**/*.test.tsx`: unit and component tests.
- `playwright.config.ts`, `tests/workout-flow.spec.ts`: browser smoke test.
- `public/icons/`: Vite-served PWA icon assets.
- `manifest.json`, `sw.js`: removed direct service worker use after PWA plugin is configured; keep icons unchanged.
- `eslint.config.js`, `.prettierrc`, `.prettierignore`: lint and format tooling.

## Task 1: Scaffold Vite React TypeScript Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/vite-env.d.ts`
- Modify: `index.html`

- [x] **Step 1: Install dependencies**

Run:

```bash
npm install @vitejs/plugin-react @tailwindcss/vite vite typescript react react-dom tailwindcss dexie dexie-react-hooks zustand @js-temporal/polyfill vite-plugin-pwa lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb playwright
```

Expected: dependencies are added to `package.json` and `package-lock.json`.

- [x] **Step 2: Create `package.json` scripts**

Use this script block:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [x] **Step 3: Create TypeScript config**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.node.json" }],
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [x] **Step 4: Create Vite config**

`vite.config.ts` should initially contain React, Tailwind, Vitest, and complete PWA metadata copied from the existing manifest:

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-180.png', 'icons/splash.png'],
      manifest: {
        name: 'Treadmill Workout',
        short_name: 'Workout',
        description: 'Беговая дорожка — тренировки и статистика',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-180.png', sizes: '180x180', type: 'image/png' }
        ],
        categories: ['health', 'fitness'],
        lang: 'ru'
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true
  }
});
```

- [x] **Step 5: Replace `index.html` with Vite entry**

Preserve PWA meta tags and icons, but remove inline app code:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Workout</title>
    <meta name="theme-color" content="#000000" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Workout" />
    <link rel="apple-touch-icon" href="/icons/icon-180.png" />
    <link rel="apple-touch-startup-image" href="/icons/splash.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 6: Create React smoke entry**

`src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx`:

```tsx
export function App() {
  return <div className="min-h-dvh bg-black text-white">Workout</div>;
}
```

`src/index.css`:

```css
@import "tailwindcss";

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body,
#root {
  min-height: 100%;
  background: #000;
}

body {
  margin: 0;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [x] **Step 7: Run build**

Run:

```bash
npm run build
```

Expected: build passes and `dist/` is generated.

- [x] **Step 8: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src
git commit -m "Set up React Vite TypeScript app"
```

## Task 2: Add Domain Model, Date Helpers, Stats, And Tests

**Files:**
- Create: `src/domain/workout.ts`
- Create: `src/domain/date-time.ts`
- Create: `src/domain/stats.ts`
- Create: `src/domain/export.ts`
- Create: `src/domain/workout.test.ts`
- Create: `src/domain/stats.test.ts`
- Create: `src/domain/export.test.ts`
- Create: `src/test/setup.ts`

- [x] **Step 1: Create test setup**

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

- [x] **Step 2: Write failing domain tests**

`src/domain/workout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatCadence, formatDuration, formatPace, formatSpeed, workoutSeconds } from './workout';

describe('workout calculations', () => {
  it('formats duration as hh:mm:ss', () => {
    expect(formatDuration(3723)).toBe('01:02:03');
  });

  it('uses seconds before legacy minute fallback', () => {
    expect(workoutSeconds({ seconds: 125, min: 99 })).toBe(125);
    expect(workoutSeconds({ min: 3 })).toBe(180);
  });

  it('calculates pace, speed, and cadence', () => {
    const workout = { seconds: 1800, min: 30, km: 3, steps: 3600 };
    expect(formatPace(workout)).toBe('10\\'00"');
    expect(formatSpeed(workout)).toBe('6.0');
    expect(formatCadence(workout)).toBe('120');
  });
});
```

`src/domain/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getPeriodWorkouts, summarizeWorkouts } from './stats';
import type { Workout } from './workout';

const workouts: Workout[] = [
  { id: 1, date: '2026-06-01', time: '08:00', seconds: 600, min: 10, km: 1, kcal: 65, steps: 1200, maxSpeed: 6 },
  { id: 2, date: '2026-06-10', time: '08:00', seconds: 1200, min: 20, km: 2, kcal: 130, steps: 2400, maxSpeed: 7 },
  { id: 3, date: '2025-06-10', time: '08:00', seconds: 1800, min: 30, km: 3, kcal: 195, steps: 3600, maxSpeed: 8 }
];

describe('stats', () => {
  it('summarizes workouts', () => {
    expect(summarizeWorkouts(workouts)).toEqual({
      workouts: 3,
      min: 60,
      kcal: 390,
      km: 6,
      steps: 7200
    });
  });

  it('filters by month and year using local calendar dates', () => {
    expect(getPeriodWorkouts(workouts, 'month', '2026-06-13').map((w) => w.id)).toEqual([1, 2]);
    expect(getPeriodWorkouts(workouts, 'year', '2026-06-13').map((w) => w.id)).toEqual([1, 2]);
    expect(getPeriodWorkouts(workouts, 'all', '2026-06-13').map((w) => w.id)).toEqual([1, 2, 3]);
  });
});
```

`src/domain/export.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createExportPayload } from './export';

describe('createExportPayload', () => {
  it('creates versioned export data', () => {
    const payload = createExportPayload([], '2026-06-13T10:00:00.000Z');
    expect(payload).toEqual({
      schemaVersion: 1,
      exportedAt: '2026-06-13T10:00:00.000Z',
      workouts: []
    });
  });
});
```

- [x] **Step 3: Run tests to verify failure**

Run:

```bash
npm run test -- src/domain
```

Expected: tests fail because domain modules do not exist.

- [x] **Step 4: Implement domain modules**

`src/domain/workout.ts`:

```ts
export type Workout = {
  id: number;
  date: string;
  time: string;
  seconds: number;
  km: number;
  kcal: number;
  min: number;
  steps: number;
  maxSpeed: number;
};

export type WorkoutLike = Partial<Pick<Workout, 'seconds' | 'min' | 'km' | 'steps' | 'maxSpeed'>>;

export function workoutSeconds(workout: WorkoutLike): number {
  return Math.max(0, workout.seconds ?? (workout.min ?? 0) * 60);
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPaceSeconds(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

export function formatPace(workout: WorkoutLike): string {
  const seconds = workoutSeconds(workout);
  if (!workout.km || !seconds) return '--';
  return formatPaceSeconds(seconds / workout.km);
}

export function formatSpeed(workout: WorkoutLike): string {
  const seconds = workoutSeconds(workout);
  if (!workout.km || !seconds) return '--';
  return (workout.km / (seconds / 3600)).toFixed(1);
}

export function formatCadence(workout: WorkoutLike): string {
  const minutes = workoutSeconds(workout) / 60;
  if (!workout.steps || !minutes) return '--';
  return String(Math.round(workout.steps / minutes));
}
```

`src/domain/date-time.ts`:

```ts
import { Temporal } from '@js-temporal/polyfill';

export type LocalDateString = `${number}-${number}-${number}`;

export function todayPlainDate(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO();
}

export function toPlainDate(date: string): Temporal.PlainDate {
  return Temporal.PlainDate.from(date);
}

export function todayString(): string {
  return todayPlainDate().toString();
}

export function nowTimeString(): string {
  const now = Temporal.Now.plainTimeISO();
  return `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = new Intl.DateTimeFormat('ru', { month: 'long' }).format(date);
  return `${year} · ${monthName[0].toUpperCase()}${monthName.slice(1)}`;
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('ru', { maximumFractionDigits }).format(value);
}
```

`src/domain/stats.ts`:

```ts
import { Temporal } from '@js-temporal/polyfill';
import type { Workout } from './workout';

export type StatsPeriod = 'week' | 'month' | 'year' | 'all';

export type WorkoutSummary = {
  workouts: number;
  min: number;
  kcal: number;
  km: number;
  steps: number;
};

export function summarizeWorkouts(workouts: Workout[]): WorkoutSummary {
  return workouts.reduce(
    (summary, workout) => ({
      workouts: summary.workouts + 1,
      min: summary.min + workout.min,
      kcal: summary.kcal + workout.kcal,
      km: summary.km + workout.km,
      steps: summary.steps + (workout.steps || 0)
    }),
    { workouts: 0, min: 0, kcal: 0, km: 0, steps: 0 },
  );
}

export function getPeriodWorkouts(workouts: Workout[], period: StatsPeriod, today = Temporal.Now.plainDateISO().toString()): Workout[] {
  if (period === 'all') return workouts;

  const now = Temporal.PlainDate.from(today);
  return workouts.filter((workout) => {
    const date = Temporal.PlainDate.from(workout.date);
    if (period === 'week') {
      const dayOfWeek = now.dayOfWeek % 7;
      const start = now.subtract({ days: dayOfWeek });
      return Temporal.PlainDate.compare(date, start) >= 0;
    }
    if (period === 'month') {
      return date.year === now.year && date.month === now.month;
    }
    return date.year === now.year;
  });
}
```

`src/domain/export.ts`:

```ts
import type { Workout } from './workout';

export type WorkoutExportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  workouts: Workout[];
};

export function createExportPayload(workouts: Workout[], exportedAt = new Date().toISOString()): WorkoutExportPayload {
  return {
    schemaVersion: 1,
    exportedAt,
    workouts
  };
}
```

- [x] **Step 5: Run tests**

Run:

```bash
npm run test -- src/domain
```

Expected: all domain tests pass.

- [x] **Step 6: Commit domain layer**

Run:

```bash
git add src/domain src/test/setup.ts
git commit -m "Add workout domain calculations"
```

## Task 3: Add Dexie Database And Legacy localStorage Migration

**Files:**
- Create: `src/db/app-db.ts`
- Create: `src/db/workout-repository.ts`
- Create: `src/db/workout-repository.test.ts`

- [x] **Step 1: Write failing repository tests**

`src/db/workout-repository.test.ts`:

```ts
import Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './app-db';
import { addWorkout, getWorkout, listWorkouts, migrateLegacyLocalStorageWorkouts } from './workout-repository';
import type { Workout } from '../domain/workout';

const workout: Workout = {
  id: 100,
  date: '2026-06-13',
  time: '08:30',
  seconds: 600,
  min: 10,
  km: 1,
  kcal: 65,
  steps: 1200,
  maxSpeed: 6
};

describe('workout repository', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await db.workouts.clear();
  });

  it('adds, lists, and gets workouts newest first', async () => {
    await addWorkout(workout);
    await addWorkout({ ...workout, id: 101, date: '2026-06-14' });

    expect((await listWorkouts()).map((item) => item.id)).toEqual([101, 100]);
    expect(await getWorkout(100)).toEqual(workout);
  });

  it('migrates valid legacy localStorage data once without deleting it', async () => {
    localStorage.setItem('treadmill_v2', JSON.stringify([workout]));

    await migrateLegacyLocalStorageWorkouts();
    await migrateLegacyLocalStorageWorkouts();

    expect(await listWorkouts()).toEqual([workout]);
    expect(localStorage.getItem('treadmill_v2')).toBe(JSON.stringify([workout]));
    expect(localStorage.getItem('treadmill_v2_migrated_to_dexie')).toBe('1');
  });

  it('ignores invalid legacy localStorage data and marks migration complete', async () => {
    localStorage.setItem('treadmill_v2', '{broken');

    await migrateLegacyLocalStorageWorkouts();

    expect(await listWorkouts()).toEqual([]);
    expect(localStorage.getItem('treadmill_v2_migrated_to_dexie')).toBe('1');
  });
});
```

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test -- src/db
```

Expected: tests fail because DB modules do not exist.

- [x] **Step 3: Implement Dexie database**

`src/db/app-db.ts`:

```ts
import Dexie, { type Table } from 'dexie';
import type { Workout } from '../domain/workout';

export class AppDb extends Dexie {
  workouts!: Table<Workout, number>;

  constructor() {
    super('treadmill-workout-db');
    this.version(1).stores({
      workouts: 'id, date'
    });
  }
}

export const db = new AppDb();
```

`src/db/workout-repository.ts`:

```ts
import { db } from './app-db';
import type { Workout } from '../domain/workout';

const LEGACY_KEY = 'treadmill_v2';
const MIGRATION_KEY = 'treadmill_v2_migrated_to_dexie';

function isWorkout(value: unknown): value is Workout {
  if (!value || typeof value !== 'object') return false;
  const workout = value as Record<string, unknown>;
  return (
    typeof workout.id === 'number' &&
    typeof workout.date === 'string' &&
    typeof workout.time === 'string' &&
    typeof workout.seconds === 'number' &&
    typeof workout.km === 'number' &&
    typeof workout.kcal === 'number' &&
    typeof workout.min === 'number' &&
    typeof workout.steps === 'number' &&
    typeof workout.maxSpeed === 'number'
  );
}

export async function listWorkouts(): Promise<Workout[]> {
  return db.workouts.orderBy('date').reverse().toArray();
}

export async function getWorkout(id: number): Promise<Workout | undefined> {
  return db.workouts.get(id);
}

export async function addWorkout(workout: Workout): Promise<number> {
  return db.workouts.put(workout);
}

export async function bulkPutWorkouts(workouts: Workout[]): Promise<number> {
  return db.workouts.bulkPut(workouts);
}

export async function exportWorkouts(): Promise<Workout[]> {
  return listWorkouts();
}

export async function migrateLegacyLocalStorageWorkouts(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY) === '1') return;

  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      const workouts = parsed.filter(isWorkout);
      if (workouts.length > 0) {
        await bulkPutWorkouts(workouts);
      }
    }
  } catch (error) {
    console.warn('Unable to migrate legacy workouts', error);
  } finally {
    localStorage.setItem(MIGRATION_KEY, '1');
  }
}
```

- [x] **Step 4: Run repository tests**

Run:

```bash
npm run test -- src/db
```

Expected: all repository tests pass.

- [x] **Step 5: Commit persistence layer**

Run:

```bash
git add src/db
git commit -m "Add Dexie workout persistence"
```

## Task 4: Build Runtime Stores And App Shell

**Files:**
- Create: `src/app/app-store.ts`
- Replace: `src/App.tsx`
- Create: `src/ui/Toast.tsx`
- Create: `src/ui/TabBar.tsx`

- [x] **Step 1: Implement runtime app store**

`src/app/app-store.ts`:

```ts
import { create } from 'zustand';
import type { StatsPeriod } from '../domain/stats';

export type ScreenName = 'home' | 'stats' | 'history' | 'detail' | 'live';

type ToastState = {
  message: string;
  visible: boolean;
};

type AppState = {
  screen: ScreenName;
  selectedWorkoutId: number | null;
  statsPeriod: StatsPeriod;
  toast: ToastState;
  showScreen: (screen: ScreenName) => void;
  showWorkoutDetail: (id: number) => void;
  setStatsPeriod: (period: StatsPeriod) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  screen: 'home',
  selectedWorkoutId: null,
  statsPeriod: 'week',
  toast: { message: '', visible: false },
  showScreen: (screen) => set({ screen }),
  showWorkoutDetail: (id) => set({ selectedWorkoutId: id, screen: 'detail' }),
  setStatsPeriod: (statsPeriod) => set({ statsPeriod }),
  showToast: (message) => set({ toast: { message, visible: true } }),
  hideToast: () => set((state) => ({ toast: { ...state.toast, visible: false } }))
}));
```

- [x] **Step 2: Implement toast**

`src/ui/Toast.tsx`:

```tsx
import { useEffect } from 'react';
import { useAppStore } from '../app/app-store';

export function Toast() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = window.setTimeout(hideToast, 2800);
    return () => window.clearTimeout(timer);
  }, [hideToast, toast.visible]);

  return (
    <div
      className={`fixed left-1/2 top-[60px] z-[9998] -translate-x-1/2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl transition-transform duration-300 ${
        toast.visible ? 'translate-y-0' : '-translate-y-20'
      }`}
    >
      {toast.message}
    </div>
  );
}
```

- [x] **Step 3: Implement tab bar**

`src/ui/TabBar.tsx`:

```tsx
import { BarChart3, History, Home } from 'lucide-react';
import { useAppStore, type ScreenName } from '../app/app-store';

const tabs: Array<{ screen: ScreenName; label: string; Icon: typeof Home }> = [
  { screen: 'home', label: 'Home', Icon: Home },
  { screen: 'stats', label: 'Stats', Icon: BarChart3 },
  { screen: 'history', label: 'History', Icon: History }
];

export function TabBar() {
  const screen = useAppStore((state) => state.screen);
  const showScreen = useAppStore((state) => state.showScreen);

  if (screen === 'live' || screen === 'detail') return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-neutral-800 bg-neutral-900 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
      {tabs.map(({ screen: tabScreen, label, Icon }) => (
        <button
          key={tabScreen}
          type="button"
          className={`flex flex-1 flex-col items-center gap-1 text-[10px] font-medium ${screen === tabScreen ? 'text-white' : 'text-neutral-600'}`}
          onClick={() => showScreen(tabScreen)}
        >
          <Icon size={24} />
          {label}
        </button>
      ))}
    </nav>
  );
}
```

- [x] **Step 4: Replace app shell**

`src/App.tsx`:

```tsx
import { useEffect } from 'react';
import { useAppStore } from './app/app-store';
import { migrateLegacyLocalStorageWorkouts } from './db/workout-repository';
import { HomeScreen } from './features/home/HomeScreen';
import { LiveScreen } from './features/live/LiveScreen';
import { StatsScreen } from './features/stats/StatsScreen';
import { HistoryScreen } from './features/workouts/HistoryScreen';
import { WorkoutDetailScreen } from './features/workouts/WorkoutDetailScreen';
import { TabBar } from './ui/TabBar';
import { Toast } from './ui/Toast';

export function App() {
  const screen = useAppStore((state) => state.screen);
  const showToast = useAppStore((state) => state.showToast);

  useEffect(() => {
    migrateLegacyLocalStorageWorkouts().catch((error) => {
      console.error(error);
      showToast('Не удалось перенести старые тренировки');
    });
  }, [showToast]);

  return (
    <div className="min-h-dvh bg-black text-white">
      {screen === 'home' && <HomeScreen />}
      {screen === 'live' && <LiveScreen />}
      {screen === 'stats' && <StatsScreen />}
      {screen === 'history' && <HistoryScreen />}
      {screen === 'detail' && <WorkoutDetailScreen />}
      <TabBar />
      <Toast />
    </div>
  );
}
```

- [x] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: build fails until the screen components are added in later tasks. Do not commit this task until minimal compiling screen components or real screens compile.

## Task 5: Implement Home, Live Store, And Live Screen

**Files:**
- Create: `src/features/home/HomeScreen.tsx`
- Create: `src/features/live/live-store.ts`
- Create: `src/features/live/LiveScreen.tsx`
- Create: `src/features/bluetooth/ftms.ts`
- Create: `src/ui/TreadmillArt.tsx`

- [x] **Step 1: Implement Bluetooth helper**

`src/features/bluetooth/ftms.ts`:

```ts
export const FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
export const TREADMILL_DATA_CHARACTERISTIC = '00002acd-0000-1000-8000-00805f9b34fb';

export type TreadmillData = {
  speedKph: number;
  distanceKm?: number;
};

export function parseTreadmillData(value: DataView): TreadmillData {
  const flags = value.getUint16(0, true);
  const speedKph = value.getUint16(2, true) * 0.01;
  const distanceKm =
    flags & 0x0004 ? (value.getUint8(4) | (value.getUint8(5) << 8) | (value.getUint8(6) << 16)) / 1000 : undefined;
  return { speedKph, distanceKm };
}
```

- [x] **Step 2: Implement live store**

`src/features/live/live-store.ts`:

```ts
import { create } from 'zustand';
import { addWorkout } from '../../db/workout-repository';
import { nowTimeString, todayString } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';

type LiveState = {
  isConnected: boolean;
  deviceName: string | null;
  isPaused: boolean;
  startedAt: string | null;
  seconds: number;
  speedKph: number;
  maxSpeed: number;
  km: number;
  kcal: number;
  steps: number;
  setConnection: (isConnected: boolean, deviceName: string | null) => void;
  setSpeed: (speedKph: number) => void;
  start: () => void;
  tick: () => void;
  pause: () => void;
  changeSpeed: (delta: number) => void;
  stopAndSave: () => Promise<Workout | null>;
};

export const useLiveStore = create<LiveState>((set, get) => ({
  isConnected: false,
  deviceName: null,
  isPaused: false,
  startedAt: null,
  seconds: 0,
  speedKph: 0,
  maxSpeed: 0,
  km: 0,
  kcal: 0,
  steps: 0,
  setConnection: (isConnected, deviceName) => set({ isConnected, deviceName }),
  setSpeed: (speedKph) => set((state) => ({ speedKph, maxSpeed: Math.max(state.maxSpeed, speedKph) })),
  start: () =>
    set({
      isPaused: false,
      startedAt: nowTimeString(),
      seconds: 0,
      speedKph: get().isConnected ? get().speedKph : 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0
    }),
  tick: () =>
    set((state) => {
      if (state.isPaused) return state;
      const simulatedSpeed = state.isConnected ? state.speedKph : Math.min(5 + Math.sin((state.seconds + 1) / 25) * 2, 12);
      const km = state.km + simulatedSpeed / 3600;
      return {
        seconds: state.seconds + 1,
        speedKph: simulatedSpeed,
        maxSpeed: Math.max(state.maxSpeed, simulatedSpeed),
        km,
        steps: state.steps + Math.round(simulatedSpeed * 1.4),
        kcal: km * 65
      };
    }),
  pause: () => set((state) => ({ isPaused: !state.isPaused })),
  changeSpeed: (delta) =>
    set((state) => {
      const speedKph = Math.max(0, Math.min(20, state.speedKph + delta));
      return { speedKph, maxSpeed: Math.max(state.maxSpeed, speedKph) };
    }),
  stopAndSave: async () => {
    const state = get();
    const workout: Workout = {
      id: Date.now(),
      date: todayString(),
      time: state.startedAt ?? nowTimeString(),
      seconds: state.seconds,
      km: Math.round(state.km * 100) / 100,
      kcal: Math.round(state.kcal),
      min: Math.round(state.seconds / 60),
      steps: Math.round(state.steps),
      maxSpeed: Math.round(state.maxSpeed * 10) / 10
    };
    if (workout.min <= 0) return null;
    await addWorkout(workout);
    return workout;
  }
}));
```

- [x] **Step 3: Add UI art**

`src/ui/TreadmillArt.tsx`:

```tsx
export function TreadmillArt() {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[260px]" aria-hidden="true">
      <rect x="20" y="110" width="240" height="18" rx="6" fill="#2c2c2e" />
      <rect x="30" y="114" width="220" height="10" rx="4" fill="#3a3a3c" />
      <rect x="30" y="128" width="12" height="36" rx="4" fill="#2c2c2e" />
      <rect x="24" y="162" width="24" height="6" rx="3" fill="#3a3a3c" />
      <rect x="238" y="128" width="12" height="36" rx="4" fill="#2c2c2e" />
      <rect x="232" y="162" width="24" height="6" rx="3" fill="#3a3a3c" />
      <rect x="56" y="20" width="10" height="96" rx="5" fill="#3a3a3c" />
      <rect x="56" y="20" width="90" height="10" rx="5" fill="#3a3a3c" />
      <rect x="140" y="20" width="10" height="56" rx="5" fill="#3a3a3c" />
      <rect x="62" y="6" width="78" height="20" rx="6" fill="#2c2c2e" />
      <rect x="68" y="11" width="28" height="7" rx="3" fill="#5B5BF6" opacity=".7" />
      <rect x="100" y="11" width="16" height="7" rx="3" fill="#3a3a3c" />
    </svg>
  );
}
```

- [x] **Step 4: Implement home screen**

`src/features/home/HomeScreen.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { todayString } from '../../domain/date-time';
import { summarizeWorkouts } from '../../domain/stats';
import { useLiveStore } from '../live/live-store';
import { ExportButton } from '../export/ExportButton';
import { TreadmillArt } from '../../ui/TreadmillArt';

export function HomeScreen() {
  const showScreen = useAppStore((state) => state.showScreen);
  const workouts = useLiveQuery(() => db.workouts.where('date').equals(todayString()).toArray(), []) ?? [];
  const summary = summarizeWorkouts(workouts);
  const isConnected = useLiveStore((state) => state.isConnected);
  const deviceName = useLiveStore((state) => state.deviceName);
  const start = useLiveStore((state) => state.start);

  return (
    <main className="min-h-dvh pb-24">
      <header className="flex items-center justify-between px-4 pt-14">
        <h1 className="text-[28px] font-extrabold tracking-normal">Workout</h1>
        <ExportButton />
      </header>
      <div className="mx-4 mt-2 flex h-[200px] items-center justify-center">
        <TreadmillArt />
      </div>
      <section className="mx-4 rounded-[20px] bg-neutral-900 px-4 pb-4 pt-5">
        <button
          type="button"
          className="mx-auto mb-4 block h-[90px] w-[90px] rounded-full bg-white text-[22px] font-black text-black"
          onClick={() => {
            start();
            showScreen('live');
          }}
        >
          GO
        </button>
        <div className="flex items-center justify-between rounded-[14px] bg-neutral-800 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#30D158]' : 'bg-red-500'}`} />
            <span className="truncate">{isConnected ? deviceName ?? 'Подключено' : 'Дорожка не подключена...'}</span>
          </div>
          <button type="button" className="rounded-full bg-[#5B5BF6] px-4 py-2 text-[13px] font-bold text-white">
            Подключить
          </button>
        </div>
      </section>
      <section className="mx-4 mt-2 grid grid-cols-2 gap-2.5">
        <Metric label="Калории сегодня" value={summary.kcal.toLocaleString('ru')} unit="ккал" color="text-[#5B8AF6]" />
        <Metric label="Дистанция сегодня" value={summary.km.toFixed(2)} unit="км" color="text-[#5B8AF6]" />
      </section>
      <section className="mx-4 mt-2 rounded-2xl bg-neutral-900 p-3.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-[#F06A1D]">Шаги</div>
          <div><span className="text-[26px] font-extrabold">{summary.steps.toLocaleString('ru')}</span><span className="ml-1 text-xs text-neutral-400">шаги</span></div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-2xl bg-neutral-900 p-3.5">
      <div className={`mb-1.5 text-xs font-semibold ${color}`}>{label}</div>
      <span className="text-[26px] font-extrabold">{value}</span>
      <span className="ml-1 text-xs text-neutral-400">{unit}</span>
    </div>
  );
}
```

- [x] **Step 5: Implement live screen**

`src/features/live/LiveScreen.tsx`:

{% raw %}
```tsx
import { Pause, Play } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '../../app/app-store';
import { formatDuration, formatPaceSeconds } from '../../domain/workout';
import { useLiveStore } from './live-store';

export function LiveScreen() {
  const showScreen = useAppStore((state) => state.showScreen);
  const showToast = useAppStore((state) => state.showToast);
  const { seconds, km, kcal, steps, speedKph, isPaused, tick, pause, changeSpeed, stopAndSave } = useLiveStore();

  useEffect(() => {
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [tick]);

  const timer = formatDuration(seconds).slice(3);
  const pace = speedKph > 0.1 ? formatPaceSeconds((60 / speedKph) * 60) : '--';

  return (
    <main className="min-h-dvh bg-black pb-8 text-white">
      <header className="flex items-center justify-between px-4 pt-14">
        <div />
        <div className="text-base font-bold text-neutral-400">Свободная тренировка</div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900" onClick={pause} aria-label={isPaused ? 'Продолжить' : 'Пауза'}>
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
        </button>
      </header>
      <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-[2px] text-neutral-700">Время</div>
      <div className="my-1 text-center text-[76px] font-extrabold leading-none tracking-normal tabular-nums">{timer}</div>
      <section className="mx-4 mt-3 grid grid-cols-2 gap-2.5">
        <LiveMetric label="Дистанция" value={km.toFixed(2)} unit="км" color="text-[#5B8AF6]" />
        <LiveMetric label="Калории" value={Math.round(kcal).toString()} unit="ккал" color="text-[#F06A1D]" />
        <LiveMetric label="Темп" value={pace} unit="мин/км" color="text-[#5B5BF6]" />
        <LiveMetric label="Шаги" value={Math.round(steps).toLocaleString('ru')} unit="" color="text-neutral-400" />
      </section>
      <section className="mx-4 mt-2.5 rounded-[18px] bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[1px] text-neutral-400">Скорость</div>
            <span className="text-[54px] font-extrabold leading-none">{speedKph.toFixed(1)}</span>
            <span className="ml-1 text-base text-neutral-400">км/ч</span>
          </div>
          <div className="flex gap-3">
            <button type="button" className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-800 text-3xl font-bold" onClick={() => changeSpeed(-0.5)} aria-label="Уменьшить скорость">−</button>
            <button type="button" className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#5B5BF6] text-3xl font-bold" onClick={() => changeSpeed(0.5)} aria-label="Увеличить скорость">+</button>
          </div>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full rounded-full bg-[#5B5BF6] transition-[width]" style={{ width: `${Math.min((speedKph / 20) * 100, 100)}%` }} />
        </div>
      </section>
      <button
        type="button"
        className="mx-4 mt-3 w-[calc(100%-32px)] rounded-[18px] border border-red-500/40 bg-red-500/10 p-4 text-[17px] font-bold text-red-500"
        onClick={async () => {
          const saved = await stopAndSave();
          if (saved) showToast('Тренировка сохранена');
          showScreen('home');
        }}
      >
        Завершить тренировку
      </button>
    </main>
  );
}

function LiveMetric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-[18px] bg-neutral-900 p-4">
      <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[1.5px] ${color}`}>{label}</div>
      <span className="text-[34px] font-extrabold leading-none">{value}</span>
      {unit ? <span className="ml-0.5 text-xs text-neutral-400">{unit}</span> : null}
    </div>
  );
}
```
{% endraw %}

- [x] **Step 6: Run build and adjust missing imports**

Run:

```bash
npm run build
```

Expected: build may fail because `ExportButton`, stats, history, and detail components are not created yet. Add these minimal compiling components, then replace them in later tasks:

```tsx
export function ExportButton() {
  return null;
}
```

```tsx
export function StatsScreen() {
  return <main className="min-h-dvh pb-24" />;
}
```

```tsx
export function HistoryScreen() {
  return <main className="min-h-dvh pb-24" />;
}
```

```tsx
export function WorkoutDetailScreen() {
  return <main className="min-h-dvh pb-24" />;
}
```

- [x] **Step 7: Commit home and live foundation**

Run:

```bash
git add src
git commit -m "Build workout app shell and live state"
```

## Task 6: Implement Stats, History, And Detail Screens

**Files:**
- Replace: `src/features/stats/StatsScreen.tsx`
- Replace: `src/features/workouts/HistoryScreen.tsx`
- Replace: `src/features/workouts/WorkoutDetailScreen.tsx`
- Modify: `src/domain/stats.ts`

- [x] **Step 1: Extend stats helpers**

Append chart bucket helpers to `src/domain/stats.ts`:

```ts
export type ChartBar = {
  label: string;
  value: number;
};

export function createCalorieBars(workouts: Workout[], period: StatsPeriod, today = Temporal.Now.plainDateISO().toString()): ChartBar[] {
  const now = Temporal.PlainDate.from(today);

  if (period === 'week') {
    const labels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return Array.from({ length: 7 }, (_, index) => {
      const date = now.subtract({ days: 6 - index });
      const dateString = date.toString();
      return {
        label: labels[date.dayOfWeek % 7],
        value: workouts.filter((workout) => workout.date === dateString).reduce((sum, workout) => sum + workout.kcal, 0)
      };
    });
  }

  if (period === 'month') {
    return Array.from({ length: 4 }, (_, index) => {
      const start = now.subtract({ days: (3 - index) * 7 });
      const end = start.add({ days: 6 });
      return {
        label: `Н${index + 1}`,
        value: workouts
          .filter((workout) => {
            const date = Temporal.PlainDate.from(workout.date);
            return Temporal.PlainDate.compare(date, start) >= 0 && Temporal.PlainDate.compare(date, end) <= 0;
          })
          .reduce((sum, workout) => sum + workout.kcal, 0)
      };
    });
  }

  if (period === 'year') {
    const labels = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'];
    return labels.map((label, monthIndex) => ({
      label,
      value: workouts
        .filter((workout) => {
          const date = Temporal.PlainDate.from(workout.date);
          return date.year === now.year && date.month === monthIndex + 1;
        })
        .reduce((sum, workout) => sum + workout.kcal, 0)
    }));
  }

  const years = Array.from(new Set(workouts.map((workout) => workout.date.slice(0, 4)))).sort();
  const effectiveYears = years.length > 0 ? years : [String(now.year)];
  return effectiveYears.map((year) => ({
    label: year,
    value: workouts.filter((workout) => workout.date.startsWith(year)).reduce((sum, workout) => sum + workout.kcal, 0)
  }));
}
```

- [x] **Step 2: Implement stats screen**

`src/features/stats/StatsScreen.tsx`:

{% raw %}
```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { createCalorieBars, getPeriodWorkouts, summarizeWorkouts, type StatsPeriod } from '../../domain/stats';

const periods: Array<{ value: StatsPeriod; label: string }> = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё' }
];

export function StatsScreen() {
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];
  const period = useAppStore((state) => state.statsPeriod);
  const setStatsPeriod = useAppStore((state) => state.setStatsPeriod);
  const filtered = getPeriodWorkouts(workouts, period);
  const summary = summarizeWorkouts(filtered);
  const bars = createCalorieBars(workouts, period);
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pt-14">
        <h1 className="text-[28px] font-extrabold">Статистика</h1>
      </header>
      <div className="mx-4 mt-3 flex rounded-full bg-neutral-800 p-1">
        {periods.map((item) => (
          <button key={item.value} type="button" className={`flex-1 rounded-full py-2 text-[13px] font-semibold ${period === item.value ? 'bg-white text-black' : 'text-neutral-400'}`} onClick={() => setStatsPeriod(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      <section className="mx-4 mt-3 rounded-[20px] bg-neutral-900 p-[18px]">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Время" value={summary.min.toLocaleString('ru')} unit="мин" color="text-[#5B8AF6]" />
          <Stat label="Калории" value={summary.kcal.toLocaleString('ru')} unit="ккал" color="text-[#F06A1D]" />
          <Stat label="Дистанция" value={summary.km.toFixed(2)} unit="км" color="text-[#5B8AF6]" />
          <Stat label="Тренировок" value={String(summary.workouts)} unit="" color="text-neutral-400" />
        </div>
        <div className="mt-4 flex h-20 items-end gap-1.5">
          {bars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
              <div className={`w-full rounded-t ${bar.value > 0 ? 'bg-[#5B5BF6]' : 'bg-neutral-800'}`} style={{ height: `${Math.round((bar.value / maxValue) * 68) + 4}px` }} />
              <div className="text-[9px] font-semibold text-neutral-700">{bar.label}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div>
      <div className={`mb-1 text-xs font-semibold ${color}`}>{label}</div>
      <span className="text-[28px] font-extrabold leading-none">{value}</span>
      {unit ? <span className="ml-0.5 text-xs text-neutral-400">{unit}</span> : null}
    </div>
  );
}
```
{% endraw %}

- [x] **Step 3: Implement history screen**

`src/features/workouts/HistoryScreen.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { formatMonthLabel } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';

export function HistoryScreen() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray(), []) ?? [];
  const showWorkoutDetail = useAppStore((state) => state.showWorkoutDetail);

  if (workouts.length === 0) {
    return (
      <main className="min-h-dvh pb-24">
        <header className="px-4 pt-14"><h1 className="text-[28px] font-extrabold">История</h1></header>
        <div className="px-8 py-16 text-center text-neutral-700"><div className="mb-3 text-5xl">🏃</div><p className="text-[15px] leading-relaxed">Тренировок пока нет.<br />Нажми GO чтобы начать!</p></div>
      </main>
    );
  }

  const groups = groupByMonth(workouts);
  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pt-14"><h1 className="text-[28px] font-extrabold">История</h1></header>
      <div className="mt-4">
        {groups.map(([month, items]) => (
          <section key={month}>
            <div className="mx-4 mb-2 mt-4 text-sm font-semibold text-neutral-700">{formatMonthLabel(month)}</div>
            {items.map((workout) => (
              <button key={workout.id} type="button" className="mx-4 mb-2.5 block w-[calc(100%-32px)] rounded-[18px] bg-neutral-900 px-4 py-3.5 text-left text-white" onClick={() => showWorkoutDetail(workout.id)}>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[15px] font-bold">Свободная тренировка</span>
                  <span className="text-xs text-neutral-700">{workout.date.slice(5).replace('-', '/')} {workout.time}</span>
                </div>
                <div className="flex gap-5">
                  <Metric value={String(workout.km)} unit="км" />
                  <Metric value={String(workout.kcal)} unit="ккал" />
                  <Metric value={String(workout.min)} unit="мин" />
                </div>
              </button>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

function groupByMonth(workouts: Workout[]): Array<[string, Workout[]]> {
  const groups = new Map<string, Workout[]>();
  for (const workout of workouts) {
    const key = workout.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), workout]);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function Metric({ value, unit }: { value: string; unit: string }) {
  return <div><span className="text-xl font-extrabold">{value}</span><span className="ml-0.5 text-xs text-neutral-400">{unit}</span></div>;
}
```

- [x] **Step 4: Implement detail screen**

`src/features/workouts/WorkoutDetailScreen.tsx`:

```tsx
import { ChevronLeft } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { formatCadence, formatDuration, formatPace, formatPaceSeconds, formatSpeed, workoutSeconds } from '../../domain/workout';

export function WorkoutDetailScreen() {
  const selectedWorkoutId = useAppStore((state) => state.selectedWorkoutId);
  const showScreen = useAppStore((state) => state.showScreen);
  const workout = useLiveQuery(() => (selectedWorkoutId ? db.workouts.get(selectedWorkoutId) : undefined), [selectedWorkoutId]);

  if (!workout) {
    return <main className="min-h-dvh px-5 pt-16"><button type="button" className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-neutral-900" onClick={() => showScreen('history')} aria-label="Назад"><ChevronLeft size={24} /></button><p className="mt-8 text-neutral-400">Тренировка не найдена</p></main>;
  }

  const seconds = workoutSeconds(workout);
  const pace = formatPace(workout);
  const speed = formatSpeed(workout);
  const cadence = formatCadence(workout);
  const topSpeed = workout.maxSpeed ? workout.maxSpeed.toFixed(1) : speed;
  const fastestPace = workout.maxSpeed ? formatPaceSeconds((60 / workout.maxSpeed) * 60) : pace;

  return (
    <main className="min-h-dvh bg-black pb-8 pt-16 text-white">
      <div className="flex items-center justify-between px-5"><button type="button" className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-neutral-900" onClick={() => showScreen('history')} aria-label="Назад"><ChevronLeft size={24} /></button><div /></div>
      <section className="px-8 pt-8">
        <div className="mb-2 text-[15px] font-extrabold text-neutral-400">Workout</div>
        <div className="mb-6 text-[13px] font-bold text-neutral-700">{workout.date} {workout.time}</div>
        <div className="mb-3.5 text-[17px] font-extrabold">Свободная тренировка</div>
        <div className="mb-7 flex items-end gap-2"><strong className="text-[68px] font-black leading-none">{workout.km.toFixed(2)}</strong><span className="pb-2 text-[17px] font-extrabold text-neutral-400">km</span></div>
      </section>
      <DetailCard>
        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
          <DetailMetric label="Calories(kcal)" value={String(workout.kcal)} />
          <DetailMetric label="Time" value={formatDuration(seconds)} />
          <DetailMetric label="Steps(steps)" value={String(workout.steps)} />
          <DetailMetric label="Average Pace" value={pace} />
          <DetailMetric label="Average Speed(kph)" value={speed} />
          <DetailMetric label="Average Cadence(spm)" value={cadence} />
        </div>
      </DetailCard>
      <DetailCard title="Pace"><div className="grid grid-cols-2 gap-7"><DetailMetric label="Average Pace" value={pace} /><DetailMetric label="Fastest pace" value={fastestPace} /></div></DetailCard>
      <DetailCard title="Speed"><div className="grid grid-cols-2 gap-7"><DetailMetric label="Average Speed" value={`${speed} km/h`} /><DetailMetric label="Top speed" value={`${topSpeed} km/h`} /></div></DetailCard>
    </main>
  );
}

function DetailCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return <section className="mx-5 mt-4 rounded-3xl bg-neutral-900 px-6 py-6">{title ? <div className="mb-6 text-xl font-black text-[#5B5BF6]">{title}</div> : null}{children}</section>;
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div><div className="mb-2 text-[13px] font-extrabold leading-tight text-neutral-400">{label}</div><div className="text-[24px] font-black leading-tight">{value}</div></div>;
}
```

- [x] **Step 5: Add component tests**

Create focused tests:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HistoryScreen } from './HistoryScreen';

describe('HistoryScreen', () => {
  it('renders an empty state before workouts are stored', async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/Тренировок пока нет/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 6: Run tests and build**

Run:

```bash
npm run test -- src/features src/domain
npm run build
```

Expected: tests and build pass.

- [x] **Step 7: Commit screens**

Run:

```bash
git add src
git commit -m "Add workout history stats and detail screens"
```

## Task 7: Implement JSON Export

**Files:**
- Replace: `src/features/export/ExportButton.tsx`
- Modify: `src/domain/export.ts`
- Create: `src/features/export/export-download.ts`

- [x] **Step 1: Add download helper**

`src/features/export/export-download.ts`:

```ts
import { Temporal } from '@js-temporal/polyfill';
import { createExportPayload } from '../../domain/export';
import type { Workout } from '../../domain/workout';

export function createExportFile(workouts: Workout[]) {
  const today = Temporal.Now.plainDateISO().toString();
  const payload = createExportPayload(workouts);
  return {
    fileName: `treadmill-workouts-${today}.json`,
    content: JSON.stringify(payload, null, 2)
  };
}

export function downloadJsonFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

- [x] **Step 2: Implement export button**

`src/features/export/ExportButton.tsx`:

```tsx
import { Download } from 'lucide-react';
import { useAppStore } from '../../app/app-store';
import { exportWorkouts } from '../../db/workout-repository';
import { createExportFile, downloadJsonFile } from './export-download';

export function ExportButton() {
  const showToast = useAppStore((state) => state.showToast);

  return (
    <button
      type="button"
      aria-label="Экспорт тренировок"
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white"
      onClick={async () => {
        try {
          const workouts = await exportWorkouts();
          const file = createExportFile(workouts);
          downloadJsonFile(file.fileName, file.content);
          showToast('Экспорт готов');
        } catch (error) {
          console.error(error);
          showToast('Не удалось экспортировать тренировки');
        }
      }}
    >
      <Download size={20} />
    </button>
  );
}
```

- [x] **Step 3: Run tests and build**

Run:

```bash
npm run test -- src/domain src/db
npm run build
```

Expected: tests and build pass.

- [x] **Step 4: Commit export**

Run:

```bash
git add src
git commit -m "Add workout JSON export"
```

## Task 8: Final PWA Cleanup And Browser Smoke Test

**Files:**
- Delete: `manifest.json`
- Delete: `sw.js`
- Create: `playwright.config.ts`
- Create: `tests/workout-flow.spec.ts`
- Modify: `README.md`

- [x] **Step 1: Remove manual PWA files**

Delete `manifest.json` and `sw.js` after confirming `vite-plugin-pwa` generates equivalent output.

- [x] **Step 2: Add Playwright config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Pixel 7']
  }
});
```

`tests/workout-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('records a simulated workout and opens its detail screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'GO' }).click();
  await expect(page.getByText('Свободная тренировка')).toBeVisible();
  await page.waitForTimeout(65_000);
  await page.getByRole('button', { name: /Завершить тренировку/i }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await page.getByRole('button', { name: /Свободная тренировка/i }).first().click();
  await expect(page.getByText('Average Pace')).toBeVisible();
});
```

- [x] **Step 3: Update README**

Document:

````md
# Treadmill Workout PWA

Offline-first treadmill workout tracker built with React, Vite, TypeScript, Dexie, and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run test
npm run build
npm run test:e2e
```

## Storage

Completed workouts are stored in IndexedDB through Dexie. On first launch, existing `localStorage` workouts from `treadmill_v2` are copied into Dexie without deleting the old value.
````

- [x] **Step 4: Run full verification**

Run:

```bash
npm run test
npm run build
npm run test:e2e
```

Expected: all checks pass.

- [x] **Step 5: Commit final cleanup**

Run:

```bash
git add README.md package.json package-lock.json playwright.config.ts tests vite.config.ts src
git add -u manifest.json sw.js
git commit -m "Complete React Dexie PWA migration"
```

## Self-Review

Spec coverage:

- React/Vite/TypeScript/Tailwind scaffold: Task 1.
- Dexie persistence and legacy localStorage migration: Task 3.
- Runtime Zustand state: Task 4 and Task 5.
- Temporal and Intl: Task 2.
- PWA via vite-plugin-pwa: Task 1 and Task 8.
- Offline-first JSON export: Task 7.
- Current screens and behavior: Task 5 and Task 6.
- Tests and smoke verification: Tasks 2, 3, 6, and 8.

No import, sync, backend, account, edit, or redesign tasks are included. Workout deletion was added after the original scope and is now part of the delivered app.
