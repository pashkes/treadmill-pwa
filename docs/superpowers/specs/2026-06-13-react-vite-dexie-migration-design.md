# React Vite Dexie Migration Design

Date: 2026-06-13

## Goal

Migrate the current static treadmill workout PWA from a single `index.html` file with `localStorage` persistence to a maintainable React application using Vite, TypeScript, Dexie, and Tailwind CSS.

The migrated app should preserve the current user-facing behavior:

- Home screen with daily totals.
- Web Bluetooth FTMS connection flow.
- Live workout screen with timer, speed, distance, calories, pace, and steps.
- Pause and stop controls.
- Workout history grouped by month.
- Workout detail screen.
- Stats for week, month, year, and all time.
- Offline PWA behavior and installability.

The first migration scope is offline-first local persistence with JSON export. Import and multi-device sync are out of scope.

## Current State

The app is a static PWA with these files:

- `index.html`: UI, styles, application state, Bluetooth integration, statistics, workout detail rendering, and `localStorage` persistence.
- `manifest.json`: PWA metadata.
- `sw.js`: hand-written service worker cache.
- `icons/`: PWA icons and splash image.

Persistent workouts are stored under the `localStorage` key `treadmill_v2`.

## Stack

Use:

- React with TypeScript.
- Vite as the build tool.
- Tailwind CSS through the Vite integration.
- Dexie for IndexedDB persistence.
- `dexie-react-hooks` for reactive reads.
- Zustand for runtime-only UI and live workout state.
- `@js-temporal/polyfill` for Temporal date/time APIs.
- Native `Intl` APIs for formatting dates, times, numbers, and Russian labels.
- `vite-plugin-pwa` for manifest and service worker generation.
- `lucide-react` for UI icons.
- Vitest and Testing Library for unit/component tests.
- `fake-indexeddb` for Dexie repository tests.
- Playwright for a smoke test of the core workout flow.

Do not use `date-fns`, Redux, TanStack Query, or a general-purpose component kit in this migration.

## Architecture

Create a modular source tree:

```text
src/
  app/
    App.tsx
    app-store.ts
    routes.ts
  db/
    app-db.ts
    workout-repository.ts
  domain/
    date-time.ts
    stats.ts
    workout.ts
  features/
    bluetooth/
    export/
    live/
    stats/
    workouts/
  ui/
    components/
    icons/
  main.tsx
```

Responsibilities:

- `db` owns Dexie setup, schema versions, and workout persistence APIs.
- `domain` owns pure types, date helpers, and workout/stat calculations.
- `features/bluetooth` owns Web Bluetooth FTMS connection and treadmill data parsing.
- `features/live` owns live workout runtime behavior.
- `features/workouts` owns history and workout detail screens.
- `features/stats` owns period tabs and aggregate views.
- `features/export` owns JSON export.
- `app` owns top-level navigation, PWA setup, and runtime UI state.
- `ui` owns reusable presentational components.

Keep domain logic independent from React so calculations can be tested directly.

## Data Model

Persist completed workouts in Dexie.

```ts
type Workout = {
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
```

Use the existing numeric timestamp-style `id` shape to keep migration from `localStorage` simple.

Dexie schema:

```ts
workouts: 'id, date'
```

The repository should expose:

- `listWorkouts()`
- `getWorkout(id)`
- `addWorkout(workout)`
- `bulkPutWorkouts(workouts)`
- `exportWorkouts()`

On first launch after migration, read the old `localStorage` key `treadmill_v2`. If it contains valid workouts, copy them into Dexie and mark migration complete with a separate local flag. Do not delete the old data during this migration.

## Dates And Formatting

Use `@js-temporal/polyfill` for date math because native `Temporal` is not reliably available across target browsers yet.

Use `Intl` for presentation:

- `Intl.DateTimeFormat('ru')` for month and date labels.
- `Intl.NumberFormat('ru')` for localized numeric output.

All persisted dates stay as local calendar strings in `YYYY-MM-DD` format to preserve current behavior.

## State Management

Use Zustand only for runtime state:

- Active screen.
- Toast state.
- Bluetooth connection status.
- Live workout state.
- Current stats period.

Use Dexie as the source of truth for completed workouts. Screens that read persisted workouts should use `useLiveQuery` from `dexie-react-hooks`.

## PWA

Replace `sw.js` with `vite-plugin-pwa`.

Keep current manifest behavior:

- `display: standalone`
- `display_override: ['fullscreen', 'standalone']`
- portrait orientation
- black theme and background color
- current app icons
- Russian app metadata

The app should continue to work offline after the first successful load.

## Export

Add JSON export for completed workouts.

File name:

```text
treadmill-workouts-YYYY-MM-DD.json
```

Payload:

```json
{
  "schemaVersion": 1,
  "exportedAt": "ISO timestamp",
  "workouts": []
}
```

Export reads from Dexie and downloads a local JSON file. Import is not part of this migration.

## UI

Preserve the current mobile-first dark treadmill app feel and Russian labels.

Tailwind should replace the inline CSS, but the migration should avoid unrelated redesign work. Components can refine spacing and states where React structure makes it clearer, but the visual result should remain recognizably the same app.

Use `lucide-react` icons where they naturally replace inline SVG or text symbols. Keep custom treadmill artwork only if it is easier to preserve as an SVG component.

## Error Handling

Handle:

- Dexie open or write failures with a toast and console diagnostic.
- Invalid old `localStorage` data by ignoring it and starting with an empty database.
- Web Bluetooth unsupported browser with the current user-facing message.
- Web Bluetooth request/connect/read/write failures with toast feedback.
- Export failure with a toast.

## Testing

Add focused tests:

- Domain calculations: duration, pace, speed, cadence, and period filtering.
- Export payload shape.
- Dexie repository operations using `fake-indexeddb`.
- Component smoke tests for history/detail rendering.
- Playwright smoke path: start workout, stop after simulated time or mocked timer, verify history entry, open detail screen.

## Non-Goals

- Import from JSON.
- Cloud sync.
- User accounts.
- Backend API.
- Workout editing or deletion.
- Full visual redesign.
- Rewriting Bluetooth support beyond isolating the existing behavior.

## Acceptance Criteria

- App builds with Vite and TypeScript.
- Current PWA metadata and offline behavior are preserved.
- Existing `localStorage` workouts migrate into Dexie on first launch.
- New completed workouts are stored in Dexie, not `localStorage`.
- History, detail, daily totals, and stats read from Dexie.
- JSON export downloads all persisted workouts.
- Tests cover the core calculations and persistence path.
- Manual smoke test confirms the main workout flow works in the browser.
