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

## Theme

- The app supports light and dark presentation with a three-state user preference: `system`, `light`, and `dark`.
- `system` follows the operating system setting and continues tracking it live if the OS setting changes while the page is open.
- The preference is persisted in `localStorage` under the key `subscriptions:theme`.
- An invalid, missing, or unparseable stored value falls back to `system`.
- Theme resolution belongs to CSS, not JavaScript. `:root` declares `color-scheme: light dark`, and every token is defined once with `light-dark()`, so the operating system preference is honoured during initial parse with no script involved.
- An explicit preference is expressed as a `data-theme` attribute on `<html>` holding `light` or `dark`, which narrows `color-scheme` to that single scheme. `system` is expressed by the **absence** of the attribute; it never holds the literal value `system`.
- There is no blocking inline script. A visitor on the default `system` preference — the common case — receives a correctly themed page from the CSS alone, even with JavaScript disabled.
- A visitor who has explicitly overridden their operating system setting sees their OS theme until hydration applies the stored preference. This is accepted deliberately: the intermediate state matches the browser's own canvas, scrollbars, and form controls, because `color-scheme` governs those too.
- Theme changes are applied instantly and are not animated, whether they come from a deliberate switch, from adopting a stored preference on load, or from another tab. Because the tokens resolve through `light-dark()`, which follows the non-animatable `color-scheme`, a CSS transition has nothing to interpolate; a view transition was tried and removed as not worth its failure modes.
- Changing the theme in one tab propagates to other open tabs via the `storage` event.
- Theme is per-browser client state and must not travel through the domain event stream. Cross-tab sync uses the `storage` event, not `GET /api/stream`. This matters because the in-memory store is a single process-wide singleton with one global listener set — an event broadcast from it reaches every connected visitor, so routing theme through it would let one visitor change everyone's theme.
- The theme control is available in the dashboard header.
