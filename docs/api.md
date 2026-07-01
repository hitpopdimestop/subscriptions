# API

This app intentionally uses a BFF-style API for the frontend instead of strict REST resource modeling. The goal is to hide any more complex upstream shape and give the UI a small, action-oriented contract that is easy to consume.

## `POST /api/graphql`

GraphQL should be used for read fetching.

It should cover:

- initial dashboard bootstrap
- subscription pagination
- transaction pagination

The initial dashboard bootstrap should be fetchable in one GraphQL request so the server can return:

- the first subscription slice
- the first transaction slice
- a `snapshotEventId`

`snapshotEventId` should be the latest emitted SSE event id captured atomically with the returned slices. If no live events have been emitted yet, it should be `0`.

One acceptable query shape is:

```graphql
query DashboardBootstrap(
  $status: SubscriptionFilterStatus
  $subscriptionLimit: Int!
  $transactionLimit: Int!
) {
  dashboardBootstrap(
    status: $status
    subscriptionLimit: $subscriptionLimit
    transactionLimit: $transactionLimit
  ) {
    snapshotEventId
    subscriptions {
      items {
        id
        planName
        amountCents
        currency
        status
        billingIntervalMs
        nextBillingAt
        pausedAt
        pauseUntil
        canceledAt
        createdAt
        updatedAt
      }
      limit
      nextCursor
    }
    transactions {
      items {
        id
        subscriptionId
        planName
        amountCents
        currency
        createdAt
      }
      limit
      nextCursor
    }
  }
}
```

The same endpoint should also support follow-up slice queries for subscriptions and transactions separately.

One acceptable follow-up query shape is:

```graphql
query SubscriptionSlice(
  $status: SubscriptionFilterStatus
  $limit: Int
  $cursor: String
) {
  subscriptions(status: $status, limit: $limit, cursor: $cursor) {
    items {
      id
      planName
      amountCents
      currency
      status
      billingIntervalMs
      nextBillingAt
      pausedAt
      pauseUntil
      canceledAt
      createdAt
      updatedAt
    }
    limit
    nextCursor
  }
}
```

```graphql
query TransactionSlice($limit: Int, $cursor: String) {
  transactions(limit: $limit, cursor: $cursor) {
    items {
      id
      subscriptionId
      planName
      amountCents
      currency
      createdAt
    }
    limit
    nextCursor
  }
}
```

Rules for subscription reads:

- Filtering must happen on the server before pagination.
- Subscriptions should be sorted by `createdAt` descending, using `id` as a stable tie-breaker.
- When the filter is omitted, the list returns all lifecycle states.
- The only supported lifecycle filter enum value in version one is `ACTIVE`.

Rules for transaction reads:

- Transactions should be sorted newest first by `createdAt`, with `id` as a stable tie-breaker.
- The live stream should append new transaction feed items after the initial SSR/RSC bootstrap.

Cursor rules:

- `limit` defaults to `5` for subscriptions and `20` for transactions.
- `cursor` is opaque.
- When `cursor` is present for a list field, it should be the only list argument because it already encodes the active list context.
- The subscription cursor should encode filter, limit, and last item position after filtering and sorting.
- The transaction cursor should encode limit and last item position after sorting.

Expected connection metadata:

- `items`: Current slice.
- `limit`: Current response limit.
- `nextCursor`: Opaque cursor for the next slice, or `null` when no more items are available.

## `GET /api/stream`

Global SSE stream for all domain events that matter to the UI.

The stream should support:

- `sinceEventId` for initial SSR/RSC replay and explicit client-created reconnects
- the browser-provided `Last-Event-ID` header for native `EventSource` auto-reconnects

When both `Last-Event-ID` and `sinceEventId` are present, the server should prefer `Last-Event-ID`.

Expected headers:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

Expected stream behavior:

- Every domain event should include an SSE `id:` field so the client can reconnect from the last applied event.
- The server may send SSE keepalive comments, but those are transport keepalives, not domain events.

Expected event categories:

- `subscription.created`
- `subscription.updated`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`
- `transaction.created`

`subscription.updated` should be used for subscription field changes that matter to the UI but are not better expressed as a dedicated lifecycle event, such as `nextBillingAt` advancing after a successful charge.

Example SSE payload:

```text
id: 184
event: subscription.paused
data: {"subscription":{"id":"sub_001","planName":"Starter","amountCents":1299,"currency":"USD","status":"paused","billingIntervalMs":1000,"nextBillingAt":"2026-07-01T12:00:10.000Z","pausedAt":"2026-07-01T12:00:00.000Z","pauseUntil":"2026-07-01T12:00:05.000Z","canceledAt":null,"createdAt":"2026-07-01T11:59:00.000Z","updatedAt":"2026-07-01T12:00:00.000Z"}}
```

Example transaction event payload:

```text
id: 185
event: transaction.created
data: {"transaction":{"id":"txn_001","subscriptionId":"sub_001","planName":"Starter","amountCents":1299,"currency":"USD","createdAt":"2026-07-01T12:00:10.000Z"}}
```

## Subscription Commands

The app needs server-side endpoints for changing subscription state so that updates from one tab can be observed by every other tab through `GET /api/stream`.

Minimum useful operations:

- Pause indefinitely.
- Pause for 1 second.
- Pause for 2 seconds.
- Pause for 5 seconds.
- Pause for a custom number of seconds.
- Resume a paused subscription.
- Cancel immediately.

Possible BFF route shapes:

- `POST /api/subscriptions`
- `POST /api/subscriptions/:id/pause`
- `POST /api/subscriptions/:id/resume`
- `POST /api/subscriptions/:id/cancel`

Create request body:

```json
{
  "planName": "Starter",
  "amountCents": 1299,
  "currency": "USD",
  "billingIntervalMs": 1000
}
```

Creation rules:

- `planName` should be a non-empty string.
- `amountCents` should be a positive integer.
- `billingIntervalMs` should stay within the demo range of `500` to `2000`.
- New subscriptions should start as `active`.
- Creation should perform one immediate successful charge.
- After that initial charge, `nextBillingAt` should be advanced to the first future slot on the fixed billing grid anchored to the creation time.
- The server should publish the corresponding subscription and transaction events to the global stream.
- The response should return the created subscription entity after the immediate charge has been applied.

Pause request body:

```json
{
  "pauseSeconds": 5
}
```

For an indefinite pause, `pauseSeconds` can be omitted or `null`.

When `pauseSeconds` is provided, it should be a positive integer number of seconds.

The server should calculate `pauseUntil` for duration-based pauses. Clients should not submit absolute pause end times.

Pausing an already paused subscription should fail.

The response should return the updated subscription entity.

Resume request body:

```json
{}
```

Resume should set `status` back to `active`, clear `pausedAt` and `pauseUntil`, and shift `nextBillingAt` by the actual paused duration.

Resuming a subscription that is not currently paused should fail.

The response should return the updated subscription entity.

Cancel request body:

```json
{}
```

The response should return the updated subscription entity.

## Command Error Handling

Command endpoints should use simple HTTP semantics:

- `404 Not Found` when the subscription id does not exist.
- `400 Bad Request` for malformed input or validation failures, such as invalid `pauseSeconds` or invalid creation fields.
- `409 Conflict` for invalid lifecycle transitions, such as pause-on-paused, pause-on-canceled, resume-on-active, resume-on-canceled, or cancel-on-canceled.

Suggested error shape:

```json
{
  "error": {
    "code": "SUBSCRIPTION_ALREADY_PAUSED",
    "message": "Subscription is already paused.",
    "subscription": {
      "id": "sub_001",
      "planName": "Starter",
      "amountCents": 1299,
      "currency": "USD",
      "status": "paused",
      "billingIntervalMs": 1000,
      "nextBillingAt": "2026-07-01T12:00:10.000Z",
      "pausedAt": "2026-07-01T12:00:00.000Z",
      "pauseUntil": "2026-07-01T12:00:05.000Z",
      "canceledAt": null,
      "createdAt": "2026-07-01T11:59:00.000Z",
      "updatedAt": "2026-07-01T12:00:00.000Z"
    }
  }
}
```

When the subscription exists, conflict responses should include the current subscription entity so the acting tab can reconcile stale state immediately.
