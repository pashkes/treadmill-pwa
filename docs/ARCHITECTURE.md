# Architecture

Treadmill Workout PWA is an offline-first React app for recording treadmill workouts, viewing history and stats, and exporting local data.

## Stack

- React and TypeScript for the UI.
- Vite for dev/build.
- Tailwind CSS for styling.
- Dexie and IndexedDB for completed workout persistence.
- Supabase for optional email/password accounts and cloud workout sync.
- `dexie-react-hooks` for reactive reads from persisted data.
- Zustand for runtime UI and live workout state.
- TanStack Router for URL-backed screens.
- `@js-temporal/polyfill` and native `Intl` APIs for date math and formatting.
- `vite-plugin-pwa` for manifest and service worker generation.
- Web Bluetooth FTMS for treadmill data.
- Vitest, Testing Library, fake-indexeddb, and Playwright for tests.

## Source Map

- `src/main.tsx`: React entry point and router provider setup.
- `src/App.tsx`: app shell, restored workout handling, and shared UI.
- `src/app/app-store.ts`: runtime app state.
- `src/app/router.tsx`: TanStack Router route tree.
- `src/db/app-db.ts`: Dexie database definition.
- `src/db/workout-repository.ts`: persistence API, export payload read path, and deletion.
- `src/db/workout-live-queries.ts`: Dexie `useLiveQuery` hooks for reactive workout reads used by screens.
- `src/domain/`: pure workout calculations, stats, date helpers, and export payload creation.
- `src/features/account/`: email/password account screen and sync status.
- `src/features/auth/`: Supabase client guard, auth service, and auth runtime store.
- `src/features/bluetooth/ftms.ts`: FTMS characteristic parsing and Web Bluetooth connection helper.
- `src/features/live/`: active workout screen, runtime store, reload recovery storage, and pure live workout calculations.
- `src/features/home/`: home screen and daily totals.
- `src/features/sync/`: workout sync service, Supabase row adapter, sync store, and app-level sync hook.
- `src/features/stats/`: stats screen and chart rendering.
- `src/features/workouts/`: history and workout detail screens.
- `src/features/export/`: JSON export UI and file download helper.
- `src/i18n/`: locale detection, translation hook, and `ru`/`uk`/`en` dictionaries.
- `src/ui/`: shared presentational components.
- `tests/`: Playwright browser smoke tests.

## Data Flow

Completed workouts are stored in Dexie and exposed through repository functions in `src/db/workout-repository.ts`.

Screens that display persisted workouts read from Dexie through hooks in `src/db/workout-live-queries.ts`, so UI updates after add/delete operations without a separate fetch cache.

Supabase sync is optional. Dexie remains the source of truth for screens, export, stats, and workout detail views. When a user signs in and the browser is online, the sync service uploads local pending workouts and downloads remote workouts into Dexie.

Workouts sync by stable `clientId`. The local numeric `id` remains the browser-only primary key used by routes such as `/workouts/$workoutId`.

Deletion uses soft deletes. `deleteWorkout()` sets `deletedAt`, updates `updatedAt`, and hides the workout from visible reads while keeping the row available for sync.

Logout keeps local data on the device. If a different account signs in later, workouts already attached to another account are not uploaded to the current account.

The active in-progress workout is a special case. It may be temporarily saved under `walking-app-active-workout` so reloads can restore metrics. This does not replace Dexie as the source of truth for completed workouts.

## Runtime State

Zustand stores runtime state only:

- Current screen.
- Toast state.
- Current stats period.
- Current locale.
- Bluetooth connection status.
- Live workout metrics and FTMS connection object.

Do not put completed workout collections into Zustand.

Live workout calculations live in pure helpers under `src/features/live/live-workout-calculations.ts`; the Zustand store adapts those helpers to runtime state, active-workout reload persistence, FTMS commands, and final Dexie saves.

## Routing

Routes are declared in `src/app/router.tsx`:

- `/`
- `/live`
- `/stats`
- `/history`
- `/account`
- `/workouts/$workoutId`

Navigation should go through TanStack Router. `App.tsx` syncs the current URL back into the Zustand screen state for compatibility with existing UI state.

## Internationalization

Supported locales are Russian (`ru`), Ukrainian (`uk`), and English (`en`). Components should call `useT()` and avoid hardcoded user-facing strings. Any new visible copy needs entries in all three locale files.

Domain functions that generate visible labels should accept an explicit locale when needed. Prefer `Intl.DateTimeFormat` and `Intl.NumberFormat` over hardcoded date, month, weekday, or number formatting.

## Bluetooth And Live Workout Flow

`connectFtms()` requests a treadmill device that exposes the FTMS service, subscribes to treadmill data notifications, and attempts to use the Fitness Machine Control Point for start, stop, and speed commands.

Control point support is optional. Some treadmills do not expose it, so connection code should degrade gracefully.

Live workout logic should avoid saving a workout before real belt movement starts. Some treadmills send pre-start countdown values through elapsed time; that should not trigger auto-stop or a visible countdown.

When a treadmill reports zero distance while still reporting speed and elapsed time, the live store estimates distance from speed and elapsed-time deltas.

## PWA

PWA metadata and generated service worker behavior live in `vite.config.ts` through `vite-plugin-pwa`. The project uses `base: './'`, so icon and generated asset paths must remain relative-build friendly.

Do not add handwritten root `manifest.json` or `sw.js`.

## Tests

Use Vitest for domain, repository, store, and component coverage. Use fake IndexedDB for Dexie tests. Use Playwright for the core browser smoke path that records a connected treadmill workout and opens its detail screen.

Run `npm run test:e2e` for changes to routing, live workout behavior, Bluetooth integration, persistence, or PWA behavior.
