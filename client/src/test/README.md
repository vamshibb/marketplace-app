# Retained frontend regression tests

From `client`, install dependencies with `npm ci`, then run:

```powershell
npm test
npm run build
```

`npm test` runs the retained `src/**/*.test.tsx` tests once using Vitest,
the existing Vite configuration, jsdom, and React Testing Library. For watch mode,
use `npm test -- --watch`. Use a current Node 24 release (24.15 or newer).

Tests cover session recovery and cache isolation, edit-form initialization,
user-review reputation invalidation, and rental availability EventSource cleanup
and cache invalidation. They use fresh QueryClients and controlled HTTP/EventSource
doubles; no backend, database, or local environment file is required for tests.
The build uses the application's normal Vite environment configuration.
