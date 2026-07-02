# Subscription Billing Runner

Demo fullstack Next.js app for observing subscription billing behavior with in-memory data and SSE updates.

## Documents

- `docs/product-scope.md` for product scope and non-goals.
- `docs/data-model.md` for seeded data and domain fields.
- `docs/api.md` for GraphQL reads, SSE, and command endpoints.
- `docs/billing-rules.md` for product-level billing behavior.
- `docs/frontend.md` for UI behavior and stale-data rules.
- `docs/architecture-overview.md` for server, client, and state structure.
- `docs/synchronization.md` for SSE replay, reconnect, and refetch behavior.
- `docs/billing-implementation.md` for scheduler and billing implementation notes.
- `docs/testing-strategy.md` for TDD order, test seams, and required backend/frontend/e2e coverage.
- `AGENTS.md` for agent-specific guidance.

## App Structure

- `src/app/` for the Next App Router entrypoints: the SSR dashboard page, layout, globals, and API routes.
- `src/features/dashboard/` for the dashboard frontend feature: components, hooks, reducer/state, URL filter state, formatting, and client-side tests.
- `src/server/subscriptions/` for the server-only billing runtime and adapters: in-memory store, GraphQL execution, SSE, cursors, HTTP helpers, and seed data.
- `src/shared/subscriptions/` for cross-boundary contract code shared by client and server: DTO types, GraphQL documents, constants, and input rules.
- `public/` for static assets such as the demo user avatar.

See `docs/architecture-overview.md` for the rendering split and ownership boundaries between these areas.

## Development

Run the app with:

```bash
yarn dev
```

Then open `http://localhost:3000`.

Use `http://localhost:3000?status=active` to open the active-only subscription view directly.
