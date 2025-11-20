# Code Review – Navigation Flicker and Enterprise Readiness

## Addressed Flicker
- Added a route-level `loading.tsx` for the dashboard segment to keep the layout populated with skeleton placeholders while server components load. Skeletons mirror the stats cards and lists to minimize layout shift and are marked with `role="status"` for accessibility. 【F:src/app/dashboard/loading.tsx†L3-L55】

## Additional Flicker Risks
- The language selector forces a full `window.location.reload()` after updating preferences, which causes a hard refresh and visible flicker. Replacing this with `router.replace` plus a translation rehydrate (or leveraging Next.js `router.refresh` after persisting the locale) would avoid the flash and keep client state intact. 【F:src/components/i18n/language-selector.tsx†L40-L70】

## Security and Reliability Notes
- Authentication uses a credentials provider with bcrypt and schema validation, which is solid, but there is no rate limiting or account lockout to mitigate brute-force attacks. Consider wiring the authorize step through an anti-abuse guard (e.g., middleware-based IP throttling) and logging failed attempts for monitoring. 【F:src/lib/auth/index.ts†L1-L75】
- The dashboard page returns `null` when a session or organization context is missing, producing a blank view rather than an explicit error or redirect. Adding defensive error boundaries plus telemetry around failed data fetches will help operations teams triage issues in production. 【F:src/app/dashboard/page.tsx†L15-L91】
- Data fetching on the dashboard is entirely dynamic (`force-dynamic`) and executes multiple uncached database reads on every navigation. For enterprise deployments, consider read caching or batching where appropriate, along with per-tenant row-level access checks to reduce load and tighten isolation. 【F:src/app/dashboard/page.tsx†L11-L91】

## Tooling Readiness
- Added a root ESLint configuration extending Next.js core web vitals rules so `npm run lint` runs non-interactively in CI and local automation. 【F:.eslintrc.json†L1-L6】
