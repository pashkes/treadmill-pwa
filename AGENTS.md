# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project

This is an offline-first treadmill workout PWA built with React, Vite, TypeScript, Tailwind CSS, Dexie, Zustand, TanStack Router, and vite-plugin-pwa.

The app records treadmill workouts, stores completed workouts locally in IndexedDB, migrates legacy `localStorage` workouts from `treadmill_v2`, supports JSON export, and includes Web Bluetooth FTMS integration.

## Commands

Use npm. The project expects Node `>=22.12.0` and npm `>=11.0.0`.

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
npm run test:e2e
npm run format:check
```

Run the narrowest useful check while developing. Before calling work complete, run at least `npm run test`, `npm run lint`, and `npm run build`. Run `npm run test:e2e` when changing routing, live workout flow, Bluetooth behavior, persistence, or PWA behavior.

## Architecture

- `src/app/`: app shell, Zustand runtime state, and TanStack Router route tree.
- `src/db/`: Dexie database setup and workout repository APIs.
- `src/domain/`: pure workout, stats, date/time, and export logic. Keep this independent from React.
- `src/features/bluetooth/`: FTMS parsing and Web Bluetooth connection helpers.
- `src/features/live/`: live workout screen and runtime workout state.
- `src/features/home/`: home screen and daily totals.
- `src/features/stats/`: stats period UI and aggregate charts.
- `src/features/workouts/`: history and workout detail screens.
- `src/features/export/`: JSON export button and download helper.
- `src/i18n/`: `ru`, `uk`, and `en` translations plus `useT()`.
- `src/ui/`: shared presentational components.
- `tests/`: Playwright smoke tests.
- `public/icons/` and `icons/`: PWA icon assets.
- `docs/superpowers/`: planning and design records for the React/Vite/Dexie migration.

## State And Data Rules

- Dexie/IndexedDB is the source of truth for completed workouts.
- Use `dexie-react-hooks` `useLiveQuery` for screens that read persisted workouts.
- Zustand is only for runtime state: active screen, selected workout id, toast state, stats period, locale, Bluetooth status, and live workout state.
- Completed workouts must not be stored in `localStorage`.
- The legacy key `treadmill_v2` is read during migration and must not be deleted by migration code.
- The active in-progress workout may be temporarily persisted in `localStorage` under `walking-app-active-workout` for reload recovery.
- Keep persisted workout dates as local `YYYY-MM-DD` strings.

## Routing

- Use `@tanstack/react-router` for URL-backed screens.
- Route definitions live in `src/app/router.tsx`.
- Keep the URL as the source for navigation. Zustand screen state is synced from the URL for existing UI state compatibility.
- Do not introduce TanStack Query; the project only uses TanStack Router.

## Internationalization

- Do not hardcode user-facing strings in components.
- Add strings to all supported locale files: `src/i18n/ru.ts`, `src/i18n/uk.ts`, and `src/i18n/en.ts`.
- Components should read translations through `useT()`.
- Domain functions that format visible labels should accept an explicit locale when needed.
- Prefer native `Intl` APIs for localized dates, numbers, weekdays, and months.

## UI Guidelines

- Preserve the mobile-first dark treadmill app style.
- Use Tailwind CSS utilities and existing component patterns.
- Use `lucide-react` icons for common UI actions.
- Avoid broad redesigns when implementing functional changes.
- Keep touch targets comfortable and layouts safe for mobile viewport and safe-area insets.

## Bluetooth And Live Workout Rules

- FTMS parsing and connection code belongs in `src/features/bluetooth/ftms.ts`.
- Treat FTMS control-point support as optional. Some treadmills do not expose it.
- Handle unsupported Web Bluetooth and connection/write failures with user-visible feedback where appropriate.
- Do not auto-complete a workout before real belt movement starts.
- If a treadmill reports zero distance, continue supporting speed and elapsed-time distance estimation.

## Testing

- Put pure domain tests next to domain modules with `*.test.ts`.
- Put component tests next to components with `*.test.tsx`.
- Dexie tests use `fake-indexeddb` through `src/test/setup.ts`.
- Playwright smoke tests live in `tests/`.
- For feature changes, add or update focused tests near the changed behavior.

## Code Style

- TypeScript is strict. Keep domain code framework-independent where practical.
- Prefer explicit type imports when importing types.
- Handle promises intentionally; ESLint enforces `no-floating-promises`.
- Avoid adding broad abstractions unless they remove real duplication or match existing patterns.
- Keep comments sparse and useful, especially around FTMS quirks, migration behavior, and non-obvious persistence choices.

## PWA

- PWA metadata and generated service worker behavior are configured in `vite.config.ts` through `vite-plugin-pwa`.
- Do not reintroduce handwritten root `manifest.json` or `sw.js`.
- Keep icon asset paths compatible with the Vite `base: './'` build.

## Git And Generated Files

- Do not commit `node_modules`, `dist`, `playwright-report`, `test-results`, or `.worktrees`.
- Do not revert unrelated user changes.
- Keep changes scoped to the requested work.
- If docs in `docs/superpowers/` drift from implementation, update them with the code change.
