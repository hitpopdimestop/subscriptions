export type SubscriptionStatus = "active" | "paused" | "canceled";

export type SubscriptionFilterStatus = "ACTIVE";

export interface SubscriptionRecord {
  id: string;
  planName: string;
  amountCents: number;
  currency: string;
  status: SubscriptionStatus;
  billingIntervalMs: number;
  nextBillingAtMs: number;
  pausedAtMs: number | null;
  pauseUntilMs: number | null;
  canceledAtMs: number | null;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TransactionRecord {
  id: string;
  subscriptionId: string;
  amountCents: number;
  currency: string;
  createdAtMs: number;
}

export interface Subscription {
  id: string;
  planName: string;
  amountCents: number;
  currency: string;
  status: SubscriptionStatus;
  billingIntervalMs: number;
  nextBillingAt: string;
  pausedAt: string | null;
  pauseUntil: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFeedItem {
  id: string;
  subscriptionId: string;
  planName: string;
  amountCents: number;
  currency: string;
  createdAt: string;
}

export interface ConnectionSlice<T> {
  items: T[];
  limit: number;
  nextCursor: string | null;
}

export interface DashboardBootstrap {
  snapshotEventId: string;
  subscriptions: ConnectionSlice<Subscription>;
  transactions: ConnectionSlice<TransactionFeedItem>;
}

export interface CreateSubscriptionInput {
  planName: string;
  amountCents: number;
  currency: string;
  billingIntervalMs: number;
}

export interface PauseSubscriptionInput {
  pauseSeconds?: number | null;
}

export interface SubscriptionListOptions {
  status?: SubscriptionFilterStatus | null;
  limit?: number | null;
  cursor?: string | null;
}

export interface TransactionListOptions {
  limit?: number | null;
  cursor?: string | null;
}

export interface DashboardBootstrapOptions {
  status?: SubscriptionFilterStatus | null;
  subscriptionLimit?: number | null;
  transactionLimit?: number | null;
}

export type SubscriptionEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.canceled";

export type DomainEventType = SubscriptionEventType | "transaction.created";

export interface DomainEventPayloadMap {
  "subscription.created": { subscription: Subscription };
  "subscription.updated": { subscription: Subscription };
  "subscription.paused": { subscription: Subscription };
  "subscription.resumed": { subscription: Subscription };
  "subscription.canceled": { subscription: Subscription };
  "transaction.created": { transaction: TransactionFeedItem };
}

export interface StoredDomainEvent<TType extends DomainEventType = DomainEventType> {
  id: number;
  idString: string;
  type: TType;
  createdAtMs: number;
  payload: DomainEventPayloadMap[TType];
}

export interface MutationResult<T> {
  value: T;
  events: StoredDomainEvent[];
}

export interface BillingStepResult {
  events: StoredDomainEvent[];
}

export interface ReplayResolution {
  events: StoredDomainEvent[];
}

export interface SeedState {
  subscriptions: SubscriptionRecord[];
  transactions: TransactionRecord[];
}

export interface ReplayConfig {
  maxEvents: number;
  maxAgeMs: number;
}
