# Testing Strategy

This app should be built with TDD.

The preferred implementation order is:

1. backend domain and billing core
2. backend adapters and API contracts
3. frontend state logic
4. frontend UI integration
5. end-to-end cross-tab flows

## Backend-First TDD

Start with the backend before building the frontend.

Recommended order inside the backend:

1. in-memory store core
2. create / pause / resume / cancel domain rules
3. recurring billing logic
4. replay buffer behavior
5. GraphQL read adapter
6. command endpoints
7. SSE adapter

Do not start by testing route handlers in isolation while the domain rules are still implicit.

## Required Test Seams

The implementation should expose stable seams that make deterministic tests straightforward:

- injectable clock or fake time source
- deterministic id generation
- scheduler step function that can be invoked directly in tests
- store core that can be tested without process-global singleton state
- adapters that wrap the core rather than embedding domain logic inside transport code

## Backend Test Levels

### Domain tests

Use unit-style tests for:

- create subscription
- immediate first charge on create
- pause indefinitely
- pause for a fixed duration
- manual resume
- timed auto-resume
- cancel
- invalid lifecycle transitions
- due-date progression on the fixed billing grid
- one-charge-only behavior for delayed billing ticks

### Adapter and contract tests

Use integration-style tests for:

- GraphQL bootstrap query
- GraphQL follow-up subscription pagination
- GraphQL transaction pagination
- command endpoint success responses
- command endpoint error responses
- SSE event payloads
- replay behavior using `sinceEventId`
- native `EventSource` reconnect compatibility through SSE `id` / `Last-Event-ID`

## Frontend TDD

After the backend contract is stable enough, move to frontend-first state tests before UI-heavy work.

Recommended order:

1. reducer and state transitions
2. stale-list logic
3. create-refetch logic
4. SSE event application
5. offline toggle and reconnect behavior
6. UI integration tests

### Frontend state tests

Cover:

- active-only filter behavior
- list staleness after create / pause / resume / cancel
- acting-tab create refetch behavior
- ignoring duplicate stale state after the acting tab already refetched
- transaction highlighting
- replay-expired UI state
- offline toggle disconnect and reconnect behavior

## End-to-End Coverage

At least a few end-to-end scenarios should exist because unit and integration tests alone will not prove the multi-tab behavior.

Minimum useful scenarios:

1. create in one tab updates that tab and marks another tab stale
2. pause in one tab propagates to another tab
3. resume in one tab propagates to another tab
4. cancel in one tab propagates to another tab
5. offline tab reconnects and replays missed events
6. replay can no longer continue and the UI requires refresh

## Practical Guidance

- Prefer deterministic tests over timer-based sleeps.
- Drive recurring billing through a testable scheduler step rather than real intervals in most tests.
- Keep domain assertions separate from transport assertions.
- Treat TDD as contract-first work: stabilize domain behavior and API shape before building the interactive frontend on top of it.
