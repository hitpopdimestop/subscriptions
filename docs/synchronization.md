# Synchronization

The first page load should be server-rendered from one GraphQL bootstrap query that returns:

- first subscription slice
- first transaction slice
- `snapshotEventId`

`snapshotEventId` is the current replay watermark captured together with that bootstrap snapshot. It is not a synthetic event for seeded startup data. If no live events have been emitted yet, it should be `0`.

Then the client opens one native `EventSource` connection to `GET /api/stream?sinceEventId=<snapshotEventId>`.

Rules:

- every SSE domain event must include an `id:` value
- apply safe local updates from SSE payloads directly
- rely on native `EventSource` auto-reconnect behavior for normal transient reconnects
- native `EventSource` reconnects should resume from the browser-provided `Last-Event-ID` header
- when `Last-Event-ID` is present, the server should prefer it over the `sinceEventId` query parameter
- if the app intentionally creates a fresh SSE connection, such as after the demo offline toggle, it should reconnect with `sinceEventId=<lastAppliedEventId>`
- if the stream does not recover after a short grace window, including replay-expired cases, the client should switch to a reload-required state instead of trying to precisely classify every SSE failure
- the demo offline toggle should intentionally close the SSE connection and later reconnect with the last applied event id
- use GraphQL slice queries for `Load more` subscriptions and older transaction history
- append older transaction slices with infinite scroll
- purely local interactions like highlighting one subscription's transactions should not require API calls

## Subscription List Staleness

- treat subscription filtering as server-side fetch behavior only
- do not locally remove rows from the visible list just because an SSE update makes them stop matching the active-only filter
- `subscription.created` should mark the subscription list stale when the created subscription id is not already present in the loaded frontend list
- `subscription.paused`, `subscription.resumed`, and `subscription.canceled` should mark the list stale only when the active-only filter is selected
- when the user refreshes a stale subscription list, refetch the first slice for the current filter and replace the local list plus cursor chain
- after a successful create command in the acting tab, refetch the first slice for the current filter immediately and replace the local list plus cursor chain
- after that acting-tab refetch, the later `subscription.created` SSE event should not mark the list stale again if the created subscription is already present locally
- showing a stale-data toast is preferred over silently refetching for ordinary SSE-driven staleness

## Transaction Feed Rules

- stored transactions stay minimal
- GraphQL transaction reads and `transaction.created` SSE payloads should expose a feed projection that already includes `planName`
- transaction deduplication should use `transaction.id`

## Replay Model

- the server keeps a bounded in-memory replay buffer for this demo
- this is not an infinite event log like Kafka
- if replay can no longer continue safely, including when the retained window no longer covers the requested event id, the UI should require a page refresh
- SSE keepalive comments are transport-level only and should not be treated as domain events
