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

## Development

Run the app with:

```bash
yarn dev
```

Then open `http://localhost:3000`.
