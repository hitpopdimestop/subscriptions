# Product Scope

- Show the 5 newest demo subscriptions by default.
- Load more subscriptions with a `Load more` button.
- Filter subscriptions by all subscriptions or active subscriptions only.
- Pause subscriptions for 1 second, 2 seconds, 5 seconds, a custom number of seconds, or indefinitely.
- Resume paused subscriptions.
- Cancel subscriptions immediately.
- Create subscriptions.
- Run billing activity automatically while the server process is up.
- Stream all meaningful domain events through one global SSE endpoint.
- Keep the implementation simple enough to understand during a demo.

## Non-goals

- Authentication or authorization.
- Persistent storage.
- Real payment provider integration.
- Multi-user data isolation.
- Cross-process or multi-instance synchronization.
- Production-grade audit logging.
