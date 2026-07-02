# Data Model

The server owns all demo state in memory. Data resets when the Next.js server restarts.

The app should seed mock data on server start:

- Enough subscriptions to exercise `Load more` behavior beyond the first 5 newest rows.
- A mix of active, duration-paused, indefinitely paused, and canceled subscriptions.
- Recent transactions so the transaction feed is not empty on first page load.
- Billing intervals in seeded demo data currently spread across `1500` to `3000` ms so live activity is still visible without becoming noisy.

Seeded startup records should initialize in-memory state directly. They should not emit synthetic domain events into the SSE replay buffer.

## Subscription

Expected fields:

- `id`: Stable subscription id.
- `planName`: Display name for the plan.
- `amountCents`: Billing amount in cents.
- `currency`: ISO currency code.
- `status`: `active`, `paused`, or `canceled`.
- `billingIntervalMs`: Demo billing interval in milliseconds. Expected range is `500` to `10000`.
- `nextBillingAt`: Date/time when the subscription is next scheduled to bill.
- `pausedAt`: Date/time when the current pause started. Use `null` when not paused.
- `pauseUntil`: Date/time when a timed pause should end. Use `null` for not paused or indefinitely paused.
- `canceledAt`: Date/time of immediate cancellation. Use `null` when not canceled.
- `createdAt`: Date/time when the demo subscription was created.
- `updatedAt`: Date/time of the last state change.

Rules:

- Pausing should set `status: "paused"` and `pausedAt` to the current time.
- Pausing an already paused subscription is invalid.
- Duration-based pause should also set `pauseUntil` to the server-calculated pause end time.
- Indefinite pause should keep `pauseUntil` as `null` and require explicit resume.
- Manual resume should set `status` back to `active`, clear `pausedAt` and `pauseUntil`, and shift `nextBillingAt` forward by the actual paused duration, i.e. `resumeTime - pausedAt`.
- Timed auto-resume should use the same shifting rule, but with `resumeTime = pauseUntil` so scheduler delay does not extend the pause.
- Immediate cancel should set `status: "canceled"` immediately, set `canceledAt`, clear any pause state, and prevent all future billing.
- After a successful charge, `nextBillingAt` should stay on the fixed billing grid derived from the prior due time, not from the actual charge timestamp.

Derived billing state in the UI:

- `active`: `status` is `active`.
- `paused`: `status` is `paused`.
- `canceled`: `status` is `canceled`.

## Transaction

Expected stored fields:

- `id`: Stable transaction id.
- `subscriptionId`: Related subscription id.
- `amountCents`: Charged amount in cents.
- `currency`: ISO currency code.
- `createdAt`: Date/time when the transaction was emitted.

Transactions in this demo represent successful charges only.

## Transaction Feed Item

The stored transaction model should stay minimal, but the transaction feed returned to the UI should include enough display context to avoid extra client joins.

Expected feed fields:

- `id`
- `subscriptionId`
- `planName`
- `amountCents`
- `currency`
- `createdAt`
