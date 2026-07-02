import {
  DEFAULT_SUBSCRIPTION_LIMIT,
  DEFAULT_TRANSACTION_LIMIT,
} from "./constants";
import type {
  ConnectionSlice,
  DashboardBootstrap,
  Subscription,
  SubscriptionFilterStatus,
  TransactionFeedItem,
} from "./types";

export const DASHBOARD_BOOTSTRAP_QUERY = `
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
`;

export const SUBSCRIPTION_SLICE_QUERY = `
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
`;

export const TRANSACTION_SLICE_QUERY = `
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
`;

export interface DashboardBootstrapResult {
  dashboardBootstrap: DashboardBootstrap;
}

export interface SubscriptionSliceResult {
  subscriptions: ConnectionSlice<Subscription>;
}

export interface TransactionSliceResult {
  transactions: ConnectionSlice<TransactionFeedItem>;
}

export function getDefaultDashboardBootstrapVariables(
  status: SubscriptionFilterStatus | null = null,
) {
  return {
    status,
    subscriptionLimit: DEFAULT_SUBSCRIPTION_LIMIT,
    transactionLimit: DEFAULT_TRANSACTION_LIMIT,
  };
}
