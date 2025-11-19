## Repo snapshot

- Stack: React + TypeScript + Vite. TailwindCSS + Radix UI used for UI primitives. Uses `@tanstack/react-query` for data fetching and `@supabase/supabase-js` as the backend integration.
- Entry points: `src/main.tsx` (QueryClient bootstrap) and `src/App.tsx` (routing, layout and lazy-loaded pages).
- Alias: `@` -> `./src` (see `vite.config.ts`).

## High-level architecture (what to expect)

- Single-page app with role-scoped sections: Admin, Nanny, Client. Routes are declared in `src/App.tsx` and grouped under Tenant routes (`TenantRoute`) and role-guarded layouts (`AdminLayout`, `NannyLayout`, `ClientLayout`).
- Pages are split into "critical" (imported directly) and many lazy-loaded pages (via React.lazy + Suspense). New feature pages typically follow the lazy + Suspense pattern.
- Global state & cross-cutting concerns:
  - Auth is provided through `src/components/AuthProvider.tsx` and `ProtectedRoute`/`PublicRoute` wrappers.
  - Booking-related context: `src/contexts/BookingContext`.
  - Data fetching uses a top-level `QueryClient` configured in `src/main.tsx` (default staleTime 5min, retry 1, no refetch on window focus).
  - There's an app-level preloader: `src/utils/dataPreloader` called from `App.tsx` on mount.

## Developer workflows (commands you'll use)

- Start dev server with HMR:

  npm run dev

- Build for production:

  npm run build

- Build dev-mode (non-minified dev build):

  npm run build:dev

- Preview production build:

  npm run preview

- Linting:

  npm run lint

Notes: scripts are defined in `package.json`. The project uses `@vitejs/plugin-react-swc` for fast refresh.

## Integration & infra points

- Supabase: supabase-specific assets and functions live under the `supabase/` folder (see `supabase/config.toml`, `supabase/functions`, and `supabase/migrations`). When changing backend contract or adding edge-functions, update those files and migrations together.
- Auth & user flows: look at `src/components/AuthRedirect.tsx`, `AuthProvider.tsx`, and OTP/password pages under `src/pages/*` to follow current redirect and verification logic.

## Project-specific conventions and patterns

- Routing:
  - Add user-facing pages under `src/pages/` grouped by tenant (admin, nanny, client). Prefer lazy-loading: const Foo = lazy(() => import('./pages/foo')) and place inside `<Suspense fallback={<PageLoader />}`.
  - Protect routes using `ProtectedRoute` and tenant-scoped routes with `TenantRoute requiredRole="..."`.

- Data fetching:
  - Use `@tanstack/react-query` hooks and keep logic in `src/services/` or `src/hooks/` where available.
  - The app relies on a central preloader `initializeDataPreloading(queryClient)` — add any essential early queries there when adding cross-app data required on first load.

- UI primitives and styling:
  - Tailwind utility classes are used throughout. Radix UI & small UI wrappers live in `src/components/ui/`.
  - To add a new component, follow existing patterns in `src/components/*` (see `AuthProvider.tsx`, `PublicRoute.tsx`, `ProtectedRoute.tsx`) and export typed props with React + TypeScript.

- Path aliasing: use `@/...` imports (example: `import { Toaster } from "@/components/ui/toaster"`), configured in `vite.config.ts` and respected by the tsconfig project references.

## Things an AI coding agent should do/avoid

- Do:
  - Keep QueryClient defaults (staleTime, retry, refetch behavior) unless you intentionally change caching semantics and update existing usages.
  - Follow the lazy + Suspense pattern for new pages to reduce bundle size.
  - Respect role-based routing: use `TenantRoute` + proper `requiredRole` to avoid accidentally exposing admin screens.
  - When adding backend changes, check `supabase/functions` and `supabase/migrations` for necessary updates.

- Avoid:
  - Direct DOM manipulation that bypasses React lifecycles — the app uses React contexts and hooks heavily.
  - Changing global routing structure in `App.tsx` without mirroring UI/permission changes in `src/components/*` auth wrappers.

## Quick examples (copyable patterns)

- Add a lazy page and route (example):

  const MyFeature = lazy(() => import("./pages/MyFeature"));

  // in App.tsx routes
  <Route path="/my-feature" element={<ProtectedRoute><Suspense fallback={<PageLoader/>}><MyFeature/></Suspense></ProtectedRoute>} />

- Use the alias import:

  import { something } from "@/services/someService";

## Key files & directories to inspect when changing behavior

- `src/App.tsx` — routing, layouts, and lazy-load patterns
- `src/main.tsx` — QueryClient bootstrap and global providers
- `vite.config.ts` — alias config and plugin list
- `package.json` — scripts and dependencies (use for commands)
- `supabase/` — backend functions, migrations and config
- `src/contexts/`, `src/services/`, `src/hooks/` — state, API clients, shared hooks

---
If you want I can: (a) merge content from an existing `.github/copilot-instructions.md` if you have one elsewhere, (b) add small examples for writing a service + query hook, or (c) produce a short checklist for code reviews tailored to this repo. Which would you like next?
