# React Vite Dexie Migration Design

Date: 2026-06-13

Status: implemented and current as of 2026-06-15. This document now records the delivered React/Vite/Dexie architecture and the intentional follow-up changes merged after the original migration plan.

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

The app has been migrated from the original static PWA to a React/Vite/TypeScript application.

- `index.html`: Vite HTML shell with the React root.
- `src/`: React application, domain logic, Dexie persistence, i18n, Bluetooth integration, and tests.
- `vite.config.ts`: React, Tailwind, Vitest, and `vite-plugin-pwa` configuration.
- `public/icons/`: PWA icons and splash image copied by Vite.
- `icons/`: source PWA icons retained in the repository.

Completed workouts are stored in Dexie/IndexedDB. The legacy `localStorage` key `treadmill_v2` is read once during migration and is not deleted. Active in-progress workouts are temporarily persisted under `walking-app-active-workout` so a page reload can restore the live session state.

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
- `@tanstack/react-router` for URL-backed screens.
- Vitest and Testing Library for unit/component tests.
- `fake-indexeddb` for Dexie repository tests.
- Playwright for a smoke test of the core workout flow.

Do not use `date-fns`, Redux, TanStack Query, or a general-purpose component kit in this migration. `@tanstack/react-router` is intentionally used only for routing.

## Architecture

Create a modular source tree:

```text
src/
  app/
    App.tsx
    app-store.ts
    router.tsx
  db/
    app-db.ts
    workout-repository.ts
  domain/
    date-time.ts
    export.ts
    stats.ts
    workout.ts
  features/
    bluetooth/
    export/
    live/
    stats/
    workouts/
  ui/
    TabBar.tsx
    Toast.tsx
    TreadmillArt.tsx
  i18n/
  main.tsx
```

Responsibilities:

- `db` owns Dexie setup, schema versions, and workout persistence APIs.
- `domain` owns pure types, date helpers, and workout/stat calculations.
- `features/bluetooth` owns Web Bluetooth FTMS connection and treadmill data parsing.
- `features/live` owns live workout runtime behavior.
- `features/workouts` owns history and workout detail screens.
- `features/stats` owns period tabs and aggregate views.
- `features/export` owns JSON export and browser download behavior.
- `app` owns top-level shell, TanStack Router setup, URL to screen-state sync, and runtime UI state.
- `i18n` owns translations for `ru`, `uk`, and `en`, locale detection, and the `useT()` hook.
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
- `deleteWorkout(id)`
- `bulkPutWorkouts(workouts)`
- `exportWorkouts()`
- `createWorkoutExportPayload()`

On first launch after migration, read the old `localStorage` key `treadmill_v2`. If it contains valid workouts, copy them into Dexie and mark migration complete with a separate local flag. Do not delete the old data during this migration.

## Dates And Formatting

Use `@js-temporal/polyfill` for date math because native `Temporal` is not reliably available across target browsers yet.

Use `Intl` for presentation:

- `Intl.DateTimeFormat(locale, { month: 'long' })` for month labels in history.
- `Intl.DateTimeFormat(locale, { weekday: 'narrow' })` for day-of-week bar labels in the weekly chart.
- `Intl.DateTimeFormat(locale, { month: 'narrow' })` for month bar labels in the yearly chart.
- `Intl.NumberFormat(locale)` for localized numeric output.

The `locale` value comes from `app-store` (see State Management below) and is passed as a parameter to domain functions (`formatMonthLabel`, `formatNumber`, `createCalorieBars`) rather than being hardcoded.

All persisted dates stay as local calendar strings in `YYYY-MM-DD` format to preserve current behavior.

## State Management

Use Zustand only for runtime state:

- Active screen.
- Selected workout id.
- Toast state.
- Bluetooth connection status.
- Live workout state.
- Current stats period.
- Current locale (detected once at startup from `navigator.language`).

Use Dexie as the source of truth for completed workouts. Screens that read persisted workouts should use `useLiveQuery` from `dexie-react-hooks`. Navigation is URL-backed with TanStack Router, with a one-way URL to Zustand sync for compatibility with the existing screen state model.

## PWA

Replace `sw.js` with `vite-plugin-pwa`.

Keep current manifest behavior:

- `display: standalone`
- `display_override: ['fullscreen', 'standalone']`
- portrait orientation
- black theme and background color
- current app icons

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

## Internationalisation

The app supports multiple locales. The default locale is detected from `navigator.language` at startup and stored in `app-store`.

Supported locales: `ru` (Russian), `uk` (Ukrainian), `en` (English, fallback).

All UI strings live in `src/i18n/` translation files. Components read translations via the `useT()` hook. Domain functions that format user-visible labels (`formatMonthLabel`, `formatNumber`, `createCalorieBars`) accept an explicit `locale` string parameter.

Chart bar labels (weekdays, months) are generated at runtime with `Intl.DateTimeFormat` rather than hardcoded arrays, so they adapt automatically to the active locale.

## UI

Preserve the current mobile-first dark treadmill app feel.

Tailwind should replace the inline CSS, but the migration should avoid unrelated redesign work. Components can refine spacing and states where React structure makes it clearer, but the visual result should remain recognizably the same app.

Use `lucide-react` icons where they naturally replace inline SVG or text symbols. Keep custom treadmill artwork only if it is easier to preserve as an SVG component.

## Error Handling

Handle:

- Dexie open or write failures with a toast and console diagnostic.
- Invalid old `localStorage` data by ignoring it and starting with an empty database.
- Web Bluetooth unsupported browser with the current user-facing message.
- Web Bluetooth request/connect/read/write failures with toast feedback.
- Export failure with a toast.
- Active workout restore after reload with a toast telling the user to reconnect the treadmill.
- Automatic stop when the treadmill reports belt speed returning to zero after real movement has started.

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
- Workout editing.
- Full visual redesign.
- Replacing Web Bluetooth/FTMS with another treadmill integration.

## Acceptance Criteria

- App builds with Vite and TypeScript.
- Current PWA metadata and offline behavior are preserved.
- Existing `localStorage` workouts migrate into Dexie on first launch.
- New completed workouts are stored in Dexie, not `localStorage`.
- History, detail, daily totals, and stats read from Dexie.
- JSON export downloads all persisted workouts.
- Tests cover the core calculations and persistence path.
- Manual smoke test confirms the main workout flow works in the browser.
- URL routes work for home, live, stats, history, and workout detail screens.
- The detail screen can delete a saved workout after confirmation.
- Active workout state can be restored after reload, while the treadmill connection itself must be re-established.
