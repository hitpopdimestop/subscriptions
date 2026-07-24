# Subscription Billing Runner

Demo fullstack Next.js app for observing subscription billing behavior with in-memory data and SSE updates.

**Live demo:** [subscriptions-dcwg.onrender.com](https://subscriptions-dcwg.onrender.com)

> The demo runs on Render's free tier and sleeps after 15 minutes of inactivity — the first visit may take up to a minute to wake. The app requires a single long-lived Node.js process (see `docs/architecture-overview.md`), so it is not deployable to stateless serverless platforms.

## How and why this was built

This app is a test of one question: how far does spec-driven development get you with **no SDD tooling** — no Spec Kit, no Kiro, just plain-markdown specs and a router file driving an AI agent? Billing was the chosen domain because it's unforgiving enough to make the answer mean something.

The process was spec-first, and the history proves it: every doc in `docs/` was committed *before* any product code. `a5f759d` adds the specs; `226b5f0` lands the implementation on top of them.

Three choices let a plain-markdown process hold up under an agent:

- **`AGENTS.md` routes, it doesn't dump.** It points the agent at the one document that governs each decision instead of every document at once — and opens with a guardrail against stale training data, since framework APIs drift faster than model weights.
- **The specs pin down test seams, not just test cases** — an injectable clock, deterministic ids, a directly callable scheduler step (see `docs/testing-strategy.md`). Without them, deterministic tests around billing time and SSE replay aren't writable.
- **The domain carries the proof.** Recurring billing on a fixed due-date grid, SSE replay, reconnect, and cross-tab sync are exactly the behaviors unit tests can't pin down — which is why the e2e layer exists, and why the test case wasn't a todo list.

The human role was architecture, specification, and review; the agent wrote the code.

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
