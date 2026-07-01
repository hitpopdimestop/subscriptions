# Billing Rules

Billing should run automatically while the server process is up.

Expected behavior:

- Iterate over subscriptions in memory.
- New subscriptions should receive one immediate successful charge during creation rather than waiting for a later billing tick.
- In each billing cycle, first check whether any timed pause should be removed, and only after that evaluate billing eligibility for the same cycle.
- Bill subscriptions only when `status === "active"` and `now >= nextBillingAt`.
- Never bill subscriptions while `status === "paused"`.
- When a timed pause reaches `pauseUntil`, the server should trigger a resume flow with `resumeTime = pauseUntil` and shift `nextBillingAt` by `resumeTime - pausedAt` before considering it billable again.
- When a subscription is resumed manually, use the same shifting rule with `resumeTime = now`.
- Create at most one successful transaction per subscription during one billing evaluation.
- After a successful charge, advance `nextBillingAt` to the first future slot on the same fixed billing grid anchored to the previous due time. Do not emit backlog bursts for missed intervals.
- The transaction timestamp records the actual execution time separately.
- Skip canceled subscriptions permanently.
- Create transaction records only for real billing attempts. Skipped subscriptions do not create transactions or skipped transaction events.
- Publish transaction and subscription events to the global stream.
