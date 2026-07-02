# Architecture Overview

The app should use a small fullstack architecture built around one in-memory server store and one interactive client dashboard. The server is the source of truth for subscriptions, transactions, replay state, SSE subscribers, and automatic billing.

This design assumes a long-lived Node.js server process. Edge and stateless serverless runtimes are not a fit for the in-memory store, SSE replay buffer, and always-on billing loop used in this demo.

The app should be implemented with backend-first TDD. Domain and billing behavior should be stabilized in tests before transport adapters and frontend workflows are built on top.

## Server Design

Use one process-global singleton store module as the single mutation boundary for:

- subscriptions
- stored transactions
- replay buffer
- SSE subscribers
- next event id
- automatic billing scheduler state

All state changes should go through command-style methods such as:

- `createSubscription`
- `pauseSubscription`
- `resumeSubscription`
- `cancelSubscription`
- internal billing methods

The in-memory DB, replay buffer, SSE subscribers, event id generation, and billing loop state should all live inside this same singleton store object.

This avoids divergent behavior across tabs, prevents duplicate in-memory stores during Next.js dev reloads, and keeps billing logic in one place.

## Read and Command API Shape

The frontend talks to a BFF-style API, not a strict REST resource API.

Why:

- it keeps the frontend contract simple
- it hides any more complex upstream shape
- it maps directly to user actions

Read interfaces:

- `POST /api/graphql`
- `GET /api/stream`

Command endpoints:

- `POST /api/subscriptions`
- `POST /api/subscriptions/:id/pause`
- `POST /api/subscriptions/:id/resume`
- `POST /api/subscriptions/:id/cancel`

GraphQL is a good fit here because the initial screen needs subscriptions, transactions, and replay bootstrap metadata in one request, while later pagination can still happen as separate queries through the same endpoint.

## Rendering Split

Use a server component page for the initial dashboard bootstrap, then hand off to a client dashboard component for interactivity.

The server-rendered bootstrap should fetch, in one GraphQL request:

- first subscription slice
- first transaction slice
- `snapshotEventId`

Why this split fits the app:

- it avoids a client bootstrap waterfall
- it reduces the race window between initial data and SSE replay
- it keeps the interactive state machine in one client boundary
- it lets the initial SSR bootstrap respect URL state such as `?status=active` before the client takes over

The server page should derive the initial subscription filter from the URL query string. In version one that means:

- no `status` query parameter => bootstrap the all-subscriptions view
- `status=active` => bootstrap the active-only view
- any other `status` value => fall back to the all-subscriptions view

The client dashboard component should own:

- native `EventSource` connection lifecycle
- reducer-driven live state updates
- mutation triggers
- demo offline toggle behavior for the stream connection
- load more subscriptions
- infinite scroll for older transactions
- toast and reload-required UI states

## Client State

Split client state into three layers.

### Server-derived data

Owned by the dashboard client component:

- current subscription slice
- current subscription cursor
- current transaction slice
- current transaction cursor
- current filter
- last applied event id
- SSE connection state
- replay-expired state

Use a reducer rather than many unrelated `useState` calls because SSE events and user actions mutate the same state graph.

### UI-only state

Keep this local:

- selected subscription id for transaction highlighting
- stale-list toast visibility
- pending mutation flags
- inline form state
- demo offline toggle state

This state should not live on the server.

### Derived state

Do not store duplicated flags or countdowns.

Instead derive them from:

- `status`
- `pauseUntil`, where relevant for timed pause messaging
- `pausedAt`, where relevant for pause duration math
- current time, where needed for rendering

Examples:

- visible billing state labels
- remaining timed pause duration
- whether a row should render pause or resume actions

## Module Layout

Keep the codebase split by runtime ownership:

- `src/app/`: Next App Router entrypoints, including `src/app/page.tsx` and the HTTP route handlers under `src/app/api/`
- `src/features/dashboard/`: dashboard-specific client code such as components, hooks, reducer/state, virtualization, and URL state handling
- `src/server/subscriptions/`: server-only billing runtime, in-memory store, GraphQL execution, SSE, cursor helpers, and seed data
- `src/shared/subscriptions/`: cross-boundary contract code that is safe to share between client and server, such as types, constants, GraphQL documents, and input rules
- `public/`: static assets used by the UI

## Cleanup Target

Before implementation, remove generated starter material that does not serve the app:

- starter homepage content
- unused starter SVG assets
- README boilerplate

Keep framework/config files that are still needed:

- Next.js config
- TypeScript config
- ESLint config
- Tailwind/global CSS entry points
- App Router layout/page structure

## Decisions To Keep Explicit

These are implementation-level choices that should still be intentional when code is written:

- replay buffer retention strategy, such as max event count, max age, or both
- exact grace-window duration before the UI switches into reload-required state
