# Billing Implementation

## Billing Model

`nextBillingAt` is the billing schedule. Pausing should shift that schedule forward by the paused duration when the subscription resumes.

Billing rules:

- A subscription is billable only when `status === "active"` and `now >= nextBillingAt`.
- New subscriptions should be charged immediately during the create flow before they enter the normal recurring billing cadence.
- A paused subscription is inactive and must never bill.
- A timed pause needs both `pausedAt` and `pauseUntil`.
- Manual resume shifts `nextBillingAt` by `now - pausedAt`.
- Timed auto-resume shifts `nextBillingAt` by `pauseUntil - pausedAt`, even if the scheduler notices the expiry slightly later.
- An indefinite pause uses `status === "paused"` with `pauseUntil = null` and requires explicit resume.
- Cancellation is immediate-only and permanently prevents future billing.

## Scheduling

Automatic billing should be implemented as one in-process scheduler or loop on the server, not one timer per browser tab.

The scheduler must be owned by the same process-global singleton store so Next.js dev reloads do not start duplicate loops against different in-memory states.

The scheduler should:

- rely on the create flow to perform the initial immediate charge for new subscriptions
- inspect in-memory subscriptions
- remove expired timed pauses before checking billing eligibility in the same tick
- auto-resume timed pauses using `pauseUntil` as the effective resume time
- create at most one successful transaction per subscription during one billing evaluation
- advance `nextBillingAt` to the first future slot on the fixed billing grid anchored to the prior due time rather than the actual charge timestamp
- publish subscription and transaction SSE events
