# Frontend

The first screen should be the working app, not a marketing or landing page.

Expected UI:

- Subscription list.
- Show 5 newest subscriptions by default with a `Load more` button for the next cursor slice.
- Filter for all subscriptions or active subscriptions only.
- The active-only view should be deep-linkable via `?status=active`. Omitting `status` should mean the all-subscriptions view.
- Visible derived billing state for active, paused, and canceled subscriptions.
- Remaining timed pause duration should be derived in the UI from `pauseUntil - now`; it should not be stored separately.
- Actions for pause indefinitely, pause for 1 second, pause for 2 seconds, pause for 5 seconds, pause for a custom number of seconds, resume, and cancel.
- Magnifying glass icon button on each subscription row that highlights matching transactions in the transaction feed.
- Subscription creation form.
- Demo-only `Go offline` / `Go online` control for disconnecting and reconnecting the SSE client without affecting server billing.
- Initial transaction feed provided by SSR/RSC bootstrap.
- Live transaction/event feed updated by `GET /api/stream`.
- Older transaction history loaded with infinite scroll.
- Toast when subscription list data may be outdated, with an explicit update button.
- Reload-required UI state when SSE replay can no longer continue safely.
- For this demo, stream errors may be treated conservatively: if the native SSE client does not recover the live stream after a short grace window, the UI may ask for a full page refresh instead of trying to classify the exact failure reason.

## List Filtering and Staleness

- Subscription filters are server-side fetch filters only.
- The current filter should round-trip through the page URL so reloads and shared links preserve the same view.
- Supported URL behavior in version one:
  - no `status` query parameter means all subscriptions
  - `status=active` means the active-only filter
  - any other `status` value should fall back to all subscriptions
- The visible client list should not be locally re-filtered after SSE updates.
- If an item is visible in the current list and later changes from `active` to `paused` or `canceled`, it should stay visible until the user refreshes the list.
- `subscription.created` received over SSE should mark the current subscription list as stale only when that subscription id is not already present in the currently loaded frontend list.
- `subscription.paused`, `subscription.resumed`, and `subscription.canceled` should mark the list as stale only when the active-only filter is selected, because server-filtered membership may have changed.
- When the user accepts the refresh action for a stale subscription list, the client should refetch the first subscription slice for the current filter and replace the locally accumulated list and cursor chain.
- The client should not silently refetch subscriptions on SSE updates. It should surface the stale state and let the user refresh explicitly.

## Create Flow

- After a successful create command in the acting tab, the client should immediately refetch the first subscription slice for the current filter and replace the local subscription list plus cursor chain.
- This create-specific refetch is tied to the local mutation result, not to the later `subscription.created` SSE event.
- After that refetch, if the later `subscription.created` SSE event refers to a subscription that already exists in the local list, the acting tab should not mark the list stale again.
