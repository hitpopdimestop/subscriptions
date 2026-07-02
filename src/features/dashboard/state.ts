import type {
  DashboardBootstrap,
  DomainEventPayloadMap,
  DomainEventType,
  Subscription,
  TransactionFeedItem,
} from "../../shared/subscriptions/types";
import type { SubscriptionFilterValue } from "./types";

export type StreamStatus = "connecting" | "live" | "offline" | "reload-required";

export interface DashboardState {
  subscriptions: Subscription[];
  subscriptionNextCursor: string | null;
  transactions: TransactionFeedItem[];
  transactionNextCursor: string | null;
  filter: SubscriptionFilterValue;
  lastAppliedEventId: string;
  streamStatus: StreamStatus;
  isSubscriptionListStale: boolean;
}

interface DashboardInitialStateInput {
  bootstrap: DashboardBootstrap;
  initialFilter: SubscriptionFilterValue;
}

type EventAppliedAction = {
  [TType in DomainEventType]: {
    type: "event/applied";
    eventId: string;
    eventType: TType;
    payload: DomainEventPayloadMap[TType];
  };
}[DomainEventType];

export type DashboardAction =
  | {
      type: "subscriptions/replaced";
      filter: SubscriptionFilterValue;
      items: Subscription[];
      nextCursor: string | null;
    }
  | {
      type: "subscriptions/appended";
      items: Subscription[];
      nextCursor: string | null;
    }
  | {
      type: "transactions/appended";
      items: TransactionFeedItem[];
      nextCursor: string | null;
    }
  | {
      type: "stream/status";
      status: StreamStatus;
    }
  | EventAppliedAction;

function dedupeSubscriptions(existing: Subscription[], incoming: Subscription[]) {
  const ids = new Set(existing.map((subscription) => subscription.id));
  return [...existing, ...incoming.filter((subscription) => !ids.has(subscription.id))];
}

function dedupeTransactions(existing: TransactionFeedItem[], incoming: TransactionFeedItem[]) {
  const ids = new Set(existing.map((transaction) => transaction.id));
  return [...existing, ...incoming.filter((transaction) => !ids.has(transaction.id))];
}

function replaceSubscriptionItem(
  subscriptions: Subscription[],
  subscription: Subscription,
) {
  const index = subscriptions.findIndex((item) => item.id === subscription.id);

  if (index === -1) {
    return subscriptions;
  }

  const nextSubscriptions = [...subscriptions];
  nextSubscriptions[index] = subscription;
  return nextSubscriptions;
}

export function createDashboardInitialState(
  input: DashboardInitialStateInput,
): DashboardState {
  const { bootstrap, initialFilter } = input;

  return {
    subscriptions: bootstrap.subscriptions.items,
    subscriptionNextCursor: bootstrap.subscriptions.nextCursor,
    transactions: bootstrap.transactions.items,
    transactionNextCursor: bootstrap.transactions.nextCursor,
    filter: initialFilter,
    lastAppliedEventId: bootstrap.snapshotEventId,
    streamStatus: "connecting",
    isSubscriptionListStale: false,
  };
}

export function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case "subscriptions/replaced":
      return {
        ...state,
        filter: action.filter,
        subscriptions: action.items,
        subscriptionNextCursor: action.nextCursor,
        isSubscriptionListStale: false,
      };
    case "subscriptions/appended":
      return {
        ...state,
        subscriptions: dedupeSubscriptions(state.subscriptions, action.items),
        subscriptionNextCursor: action.nextCursor,
      };
    case "transactions/appended":
      return {
        ...state,
        transactions: dedupeTransactions(state.transactions, action.items),
        transactionNextCursor: action.nextCursor,
      };
    case "stream/status":
      return {
        ...state,
        streamStatus: action.status,
      };
    case "event/applied": {
      const nextState: DashboardState = {
        ...state,
        lastAppliedEventId: action.eventId,
      };

      if (action.eventType === "transaction.created") {
        const transaction = action.payload.transaction;

        if (state.transactions.some((item) => item.id === transaction.id)) {
          return nextState;
        }

        return {
          ...nextState,
          transactions: [transaction, ...state.transactions],
        };
      }

      const subscription = action.payload.subscription;
      const existsLocally = state.subscriptions.some((item) => item.id === subscription.id);
      const subscriptions = replaceSubscriptionItem(state.subscriptions, subscription);
      let isSubscriptionListStale = state.isSubscriptionListStale;

      if (action.eventType === "subscription.created" && !existsLocally) {
        isSubscriptionListStale = true;
      }

      if (
        (action.eventType === "subscription.paused" ||
          action.eventType === "subscription.resumed" ||
          action.eventType === "subscription.canceled") &&
        state.filter === "active"
      ) {
        isSubscriptionListStale = true;
      }

      return {
        ...nextState,
        subscriptions,
        isSubscriptionListStale,
      };
    }
    default:
      return state;
  }
}
