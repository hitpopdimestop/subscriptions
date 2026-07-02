import { createDashboardInitialState, dashboardReducer } from "./state";
import type {
  DashboardBootstrap,
  DomainEventPayloadMap,
  DomainEventType,
  Subscription,
  TransactionFeedItem,
} from "../../shared/subscriptions/types";

function createSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_001",
    planName: "Starter",
    amountCents: 1299,
    currency: "USD",
    status: "active",
    billingIntervalMs: 2000,
    nextBillingAt: new Date(2000).toISOString(),
    pausedAt: null,
    pauseUntil: null,
    canceledAt: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function createTransaction(overrides: Partial<TransactionFeedItem> = {}): TransactionFeedItem {
  return {
    id: "txn_001",
    subscriptionId: "sub_001",
    planName: "Starter",
    amountCents: 1299,
    currency: "USD",
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function createBootstrap(): DashboardBootstrap {
  return {
    snapshotEventId: "0",
    subscriptions: {
      items: [createSubscription()],
      limit: 5,
      nextCursor: "cursor_1",
    },
    transactions: {
      items: [createTransaction()],
      limit: 20,
      nextCursor: "cursor_txn_1",
    },
  };
}

function applyEvent(
  eventType: DomainEventType,
  payload: DomainEventPayloadMap[DomainEventType],
  filter: "all" | "active" = "all",
) {
  let state = createDashboardInitialState({
    bootstrap: createBootstrap(),
    initialFilter: "all",
  });

  if (filter !== "all") {
    state = dashboardReducer(state, {
      type: "subscriptions/replaced",
      filter,
      items: state.subscriptions,
      nextCursor: state.subscriptionNextCursor,
    });
  }

  return dashboardReducer(state, {
    type: "event/applied",
    eventId: "3",
    eventType,
    payload,
  });
}

describe("dashboardReducer", () => {
  it("keeps a visible subscription in the list after a live status change", () => {
    const pausedSubscription = createSubscription({
      status: "paused",
      pausedAt: new Date(100).toISOString(),
      pauseUntil: new Date(1100).toISOString(),
    });
    const state = applyEvent(
      "subscription.paused",
      { subscription: pausedSubscription },
      "active",
    );

    expect(state.subscriptions).toHaveLength(1);
    expect(state.subscriptions[0].status).toBe("paused");
    expect(state.isSubscriptionListStale).toBe(true);
  });

  it("marks the list stale when a new subscription arrives outside the loaded slice", () => {
    const state = applyEvent("subscription.created", {
      subscription: createSubscription({
        id: "sub_999",
        planName: "Growth",
      }),
    });

    expect(state.isSubscriptionListStale).toBe(true);
    expect(state.subscriptions).toHaveLength(1);
  });

  it("marks pause, resume, and cancel events stale only while active-only is selected", () => {
    const pausedState = applyEvent(
      "subscription.paused",
      {
        subscription: createSubscription({
          status: "paused",
          pausedAt: new Date(200).toISOString(),
          pauseUntil: new Date(1200).toISOString(),
        }),
      },
      "active",
    );
    const allState = applyEvent("subscription.canceled", {
      subscription: createSubscription({
        status: "canceled",
        canceledAt: new Date(200).toISOString(),
      }),
    });

    expect(pausedState.isSubscriptionListStale).toBe(true);
    expect(allState.isSubscriptionListStale).toBe(false);
  });

  it("suppresses stale state once the acting tab already replaced the list with the created subscription", () => {
    const createdSubscription = createSubscription({
      id: "sub_999",
      planName: "Launch",
    });
    const initialState = createDashboardInitialState({
      bootstrap: createBootstrap(),
      initialFilter: "all",
    });
    const replacedState = dashboardReducer(initialState, {
      type: "subscriptions/replaced",
      filter: "all",
      items: [createdSubscription, ...initialState.subscriptions],
      nextCursor: initialState.subscriptionNextCursor,
    });
    const nextState = dashboardReducer(replacedState, {
      type: "event/applied",
      eventId: "4",
      eventType: "subscription.created",
      payload: {
        subscription: createdSubscription,
      },
    });

    expect(nextState.isSubscriptionListStale).toBe(false);
  });

  it("deduplicates transaction events by transaction id", () => {
    const initialState = createDashboardInitialState({
      bootstrap: createBootstrap(),
      initialFilter: "all",
    });
    const transaction = createTransaction({
      id: "txn_999",
      createdAt: new Date(200).toISOString(),
    });
    const once = dashboardReducer(initialState, {
      type: "event/applied",
      eventId: "2",
      eventType: "transaction.created",
      payload: {
        transaction,
      },
    });
    const twice = dashboardReducer(once, {
      type: "event/applied",
      eventId: "3",
      eventType: "transaction.created",
      payload: {
        transaction,
      },
    });

    expect(twice.transactions).toHaveLength(2);
    expect(twice.transactions[0].id).toBe("txn_999");
    expect(twice.lastAppliedEventId).toBe("3");
  });
});
