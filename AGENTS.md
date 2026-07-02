<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Docs

Read these before making product or architecture decisions:

- `@docs/product-scope.md`:
  go here for product scope, supported demo features, and non-goals.
- `@docs/data-model.md`:
  go here for subscription and transaction fields, seeded data expectations, and domain-level state rules.
- `@docs/api.md`:
  go here for GraphQL reads, SSE contract, command endpoints, and HTTP error semantics.
- `@docs/billing-rules.md`:
  go here for product-level billing behavior, pause/resume effects, and due-date progression rules.
- `@docs/frontend.md`:
  go here for UI behavior, filtering, stale-list handling, create refetch behavior, and demo-only offline mode.
- `@docs/architecture-overview.md`:
  go here for high-level app structure, singleton store boundaries, rendering split, and client/server state ownership.
- `@docs/synchronization.md`:
  go here for SSE replay, native `EventSource` reconnect behavior, `Last-Event-ID` vs `sinceEventId`, and cross-tab sync rules.
- `@docs/billing-implementation.md`:
  go here for scheduler behavior, billing-loop rules, and implementation-level billing timing details.
- `@docs/testing-strategy.md`:
  go here for TDD order, backend-first implementation flow, required test seams, and must-have unit/integration/e2e scenarios.
