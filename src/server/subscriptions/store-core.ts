import {
  DEFAULT_REPLAY_MAX_AGE_MS,
  DEFAULT_REPLAY_MAX_EVENTS,
} from "./constants";
import {
  DEFAULT_SUBSCRIPTION_LIMIT,
  DEFAULT_TRANSACTION_LIMIT,
} from "../../shared/subscriptions/constants";
import {
  decodeSubscriptionCursor,
  decodeTransactionCursor,
  encodeSubscriptionCursor,
  encodeTransactionCursor,
} from "./cursors";
import { StoreError } from "./errors";
import {
  isBillingIntervalInRange,
  isPositiveInteger,
  normalizeCurrency,
  resolveValidPauseSeconds,
} from "../../shared/subscriptions/input-rules";
import type {
  BillingStepResult,
  ConnectionSlice,
  CreateSubscriptionInput,
  DashboardBootstrap,
  DashboardBootstrapOptions,
  DomainEventPayloadMap,
  DomainEventType,
  MutationResult,
  PauseSubscriptionInput,
  ReplayConfig,
  ReplayResolution,
  SeedState,
  StoredDomainEvent,
  Subscription,
  SubscriptionFilterStatus,
  SubscriptionListOptions,
  SubscriptionRecord,
  TransactionFeedItem,
  TransactionListOptions,
  TransactionRecord,
} from "../../shared/subscriptions/types";

interface StoreCoreDependencies {
  now: () => number;
  createSubscriptionId: () => string;
  createTransactionId: () => string;
}

interface StoreCoreOptions {
  initialState?: SeedState;
  replayConfig?: Partial<ReplayConfig>;
}

export interface StoreCore {
  getCurrentEventId(): string;
  getDashboardBootstrap(options?: DashboardBootstrapOptions): DashboardBootstrap;
  listSubscriptions(options?: SubscriptionListOptions): ConnectionSlice<Subscription>;
  listTransactions(options?: TransactionListOptions): ConnectionSlice<TransactionFeedItem>;
  createSubscription(input: CreateSubscriptionInput): MutationResult<Subscription>;
  pauseSubscription(id: string, input?: PauseSubscriptionInput): MutationResult<Subscription>;
  resumeSubscription(id: string): MutationResult<Subscription>;
  cancelSubscription(id: string): MutationResult<Subscription>;
  stepBilling(nowMs: number): BillingStepResult;
  resolveReplaySince(eventId?: string | null): ReplayResolution;
}

function toIsoString(valueMs: number | null): string | null {
  if (valueMs === null) {
    return null;
  }

  return new Date(valueMs).toISOString();
}

function compareByCreatedAtDesc(
  leftCreatedAtMs: number,
  leftId: string,
  rightCreatedAtMs: number,
  rightId: string,
): number {
  if (leftCreatedAtMs !== rightCreatedAtMs) {
    return rightCreatedAtMs - leftCreatedAtMs;
  }

  return leftId.localeCompare(rightId);
}

function validateLimit(value: number | null | undefined, defaultLimit: number): number {
  if (value === null || value === undefined) {
    return defaultLimit;
  }

  if (!isPositiveInteger(value)) {
    throw new StoreError("INVALID_CURSOR", "Limit must be a positive integer.");
  }

  return value;
}

function serializeSubscription(record: SubscriptionRecord): Subscription {
  return {
    id: record.id,
    planName: record.planName,
    amountCents: record.amountCents,
    currency: record.currency,
    status: record.status,
    billingIntervalMs: record.billingIntervalMs,
    nextBillingAt: toIsoString(record.nextBillingAtMs)!,
    pausedAt: toIsoString(record.pausedAtMs),
    pauseUntil: toIsoString(record.pauseUntilMs),
    canceledAt: toIsoString(record.canceledAtMs),
    createdAt: toIsoString(record.createdAtMs)!,
    updatedAt: toIsoString(record.updatedAtMs)!,
  };
}

function buildTransactionFeedItem(
  record: TransactionRecord,
  subscriptionsById: Map<string, SubscriptionRecord>,
): TransactionFeedItem {
  const subscription = subscriptionsById.get(record.subscriptionId);

  return {
    id: record.id,
    subscriptionId: record.subscriptionId,
    planName: subscription?.planName ?? "Unknown",
    amountCents: record.amountCents,
    currency: record.currency,
    createdAt: toIsoString(record.createdAtMs)!,
  };
}

function cloneState(state: SeedState | undefined): {
  subscriptionsById: Map<string, SubscriptionRecord>;
  transactions: TransactionRecord[];
} {
  const subscriptionsById = new Map<string, SubscriptionRecord>();
  const transactions = (state?.transactions ?? []).map((transaction) => ({
    ...transaction,
  }));

  for (const subscription of state?.subscriptions ?? []) {
    subscriptionsById.set(subscription.id, { ...subscription });
  }

  return {
    subscriptionsById,
    transactions,
  };
}

function advanceToFirstFutureSlot(
  previousDueAtMs: number,
  nowMs: number,
  billingIntervalMs: number,
): number {
  let nextBillingAtMs = previousDueAtMs;

  while (nextBillingAtMs <= nowMs) {
    nextBillingAtMs += billingIntervalMs;
  }

  return nextBillingAtMs;
}

function parseEventId(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new StoreError("INVALID_EVENT_ID", "Event id must be an unsigned integer.");
  }

  return Number(value);
}

export function createStoreCore(
  deps: StoreCoreDependencies,
  options: StoreCoreOptions = {},
): StoreCore {
  const { subscriptionsById, transactions } = cloneState(options.initialState);
  const replayConfig: ReplayConfig = {
    maxAgeMs: options.replayConfig?.maxAgeMs ?? DEFAULT_REPLAY_MAX_AGE_MS,
    maxEvents: options.replayConfig?.maxEvents ?? DEFAULT_REPLAY_MAX_EVENTS,
  };

  const replayBuffer: StoredDomainEvent[] = [];
  let lastEventId = 0;

  function getSortedSubscriptions(status?: SubscriptionFilterStatus | null) {
    const subscriptions = Array.from(subscriptionsById.values());

    return subscriptions
      .filter((subscription) => {
        if (status === "ACTIVE") {
          return subscription.status === "active";
        }

        return true;
      })
      .sort((left, right) =>
        compareByCreatedAtDesc(
          left.createdAtMs,
          left.id,
          right.createdAtMs,
          right.id,
        ),
      );
  }

  function getSortedTransactions() {
    return [...transactions].sort((left, right) =>
      compareByCreatedAtDesc(
        left.createdAtMs,
        left.id,
        right.createdAtMs,
        right.id,
      ),
    );
  }

  function appendEvent<TType extends DomainEventType>(
    type: TType,
    payload: DomainEventPayloadMap[TType],
    createdAtMs: number,
    emittedEvents: StoredDomainEvent[],
  ) {
    lastEventId += 1;

    const event: StoredDomainEvent<TType> = {
      id: lastEventId,
      idString: String(lastEventId),
      type,
      createdAtMs,
      payload,
    };

    replayBuffer.push(event);
    emittedEvents.push(event);

    pruneReplayBuffer(createdAtMs);
  }

  function pruneReplayBuffer(nowMs: number) {
    const oldestAllowedMs = nowMs - replayConfig.maxAgeMs;

    while (replayBuffer.length > 0 && replayBuffer[0].createdAtMs < oldestAllowedMs) {
      replayBuffer.shift();
    }

    while (replayBuffer.length > replayConfig.maxEvents) {
      replayBuffer.shift();
    }
  }

  function requireSubscription(id: string): SubscriptionRecord {
    const subscription = subscriptionsById.get(id);

    if (!subscription) {
      throw new StoreError("SUBSCRIPTION_NOT_FOUND", "Subscription was not found.");
    }

    return subscription;
  }

  function assertCanPause(subscription: SubscriptionRecord) {
    if (subscription.status === "canceled") {
      throw new StoreError(
        "SUBSCRIPTION_ALREADY_CANCELED",
        "Subscription is already canceled.",
        serializeSubscription(subscription),
      );
    }

    if (subscription.status === "paused") {
      throw new StoreError(
        "SUBSCRIPTION_ALREADY_PAUSED",
        "Subscription is already paused.",
        serializeSubscription(subscription),
      );
    }
  }

  function assertCanResume(subscription: SubscriptionRecord) {
    if (subscription.status === "canceled") {
      throw new StoreError(
        "SUBSCRIPTION_ALREADY_CANCELED",
        "Subscription is already canceled.",
        serializeSubscription(subscription),
      );
    }

    if (subscription.status !== "paused") {
      throw new StoreError(
        "SUBSCRIPTION_NOT_PAUSED",
        "Subscription is not paused.",
        serializeSubscription(subscription),
      );
    }
  }

  function assertCanCancel(subscription: SubscriptionRecord) {
    if (subscription.status === "canceled") {
      throw new StoreError(
        "SUBSCRIPTION_ALREADY_CANCELED",
        "Subscription is already canceled.",
        serializeSubscription(subscription),
      );
    }
  }

  function createTransactionRecord(
    subscription: SubscriptionRecord,
    createdAtMs: number,
  ): TransactionRecord {
    const transaction: TransactionRecord = {
      id: deps.createTransactionId(),
      subscriptionId: subscription.id,
      amountCents: subscription.amountCents,
      currency: subscription.currency,
      createdAtMs,
    };

    transactions.push(transaction);

    return transaction;
  }

  function resumeSubscriptionRecord(
    subscription: SubscriptionRecord,
    resumeTimeMs: number,
    updatedAtMs: number,
    emittedEvents: StoredDomainEvent[],
  ) {
    const pausedAtMs = subscription.pausedAtMs ?? resumeTimeMs;
    const pausedDurationMs = Math.max(0, resumeTimeMs - pausedAtMs);

    subscription.status = "active";
    subscription.pausedAtMs = null;
    subscription.pauseUntilMs = null;
    subscription.nextBillingAtMs += pausedDurationMs;
    subscription.updatedAtMs = updatedAtMs;

    appendEvent(
      "subscription.resumed",
      { subscription: serializeSubscription(subscription) },
      updatedAtMs,
      emittedEvents,
    );
  }

  function billSubscriptionIfDue(
    subscription: SubscriptionRecord,
    nowMs: number,
    emittedEvents: StoredDomainEvent[],
  ) {
    if (subscription.status !== "active" || nowMs < subscription.nextBillingAtMs) {
      return;
    }

    const transaction = createTransactionRecord(subscription, nowMs);

    appendEvent(
      "transaction.created",
      { transaction: buildTransactionFeedItem(transaction, subscriptionsById) },
      nowMs,
      emittedEvents,
    );

    subscription.nextBillingAtMs = advanceToFirstFutureSlot(
      subscription.nextBillingAtMs,
      nowMs,
      subscription.billingIntervalMs,
    );
    subscription.updatedAtMs = nowMs;

    appendEvent(
      "subscription.updated",
      { subscription: serializeSubscription(subscription) },
      nowMs,
      emittedEvents,
    );
  }

  function validateCreateInput(input: CreateSubscriptionInput): CreateSubscriptionInput {
    const planName = input.planName.trim();

    if (planName.length === 0) {
      throw new StoreError("INVALID_PLAN_NAME", "Plan name must not be empty.");
    }

    if (!isPositiveInteger(input.amountCents)) {
      throw new StoreError(
        "INVALID_AMOUNT_CENTS",
        "Amount must be a positive integer number of cents.",
      );
    }

    const currency = normalizeCurrency(input.currency);

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new StoreError("INVALID_CURRENCY", "Currency must be a 3-letter ISO code.");
    }

    if (!isBillingIntervalInRange(input.billingIntervalMs)) {
      throw new StoreError(
        "INVALID_BILLING_INTERVAL_MS",
        "Billing interval must stay within the demo range.",
      );
    }

    return {
      planName,
      amountCents: input.amountCents,
      currency,
      billingIntervalMs: input.billingIntervalMs,
    };
  }

  function validatePauseInput(input?: PauseSubscriptionInput): number | null {
    const pauseSeconds = resolveValidPauseSeconds(input?.pauseSeconds);

    if (pauseSeconds === undefined) {
      throw new StoreError(
        "INVALID_PAUSE_SECONDS",
        "Pause seconds must be a positive integer.",
      );
    }

    return pauseSeconds;
  }

  function buildSubscriptionSlice(
    items: SubscriptionRecord[],
    limit: number | null | undefined,
    status: SubscriptionFilterStatus | null,
    cursor?: string | null,
  ): ConnectionSlice<Subscription> {
    let sliceLimit = validateLimit(limit, DEFAULT_SUBSCRIPTION_LIMIT);
    let startIndex = 0;
    let cursorStatus = status;

    if (cursor) {
      if (status !== null && status !== undefined) {
        throw new StoreError(
          "INVALID_CURSOR",
          "Status must be omitted when a cursor is provided.",
        );
      }

      if (limit !== null && limit !== undefined) {
        throw new StoreError(
          "INVALID_CURSOR",
          "Limit must be omitted when a cursor is provided.",
        );
      }

      const decoded = decodeSubscriptionCursor(cursor);
      sliceLimit = decoded.limit;
      cursorStatus = decoded.status;
      startIndex = items.findIndex(
        (item) =>
          item.createdAtMs < decoded.lastCreatedAtMs ||
          (item.createdAtMs === decoded.lastCreatedAtMs && item.id > decoded.lastId),
      );

      if (startIndex === -1) {
        startIndex = items.length;
      }
    }

    const pageItems = items.slice(startIndex, startIndex + sliceLimit);
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems.map(serializeSubscription),
      limit: sliceLimit,
      nextCursor:
        pageItems.length === sliceLimit && lastItem
          ? encodeSubscriptionCursor({
              status: cursorStatus ?? null,
              limit: sliceLimit,
              lastCreatedAtMs: lastItem.createdAtMs,
              lastId: lastItem.id,
            })
          : null,
    };
  }

  function buildTransactionSlice(
    items: TransactionRecord[],
    limit: number | null | undefined,
    cursor?: string | null,
  ): ConnectionSlice<TransactionFeedItem> {
    let sliceLimit = validateLimit(limit, DEFAULT_TRANSACTION_LIMIT);
    let startIndex = 0;

    if (cursor) {
      if (limit !== null && limit !== undefined) {
        throw new StoreError(
          "INVALID_CURSOR",
          "Limit must be omitted when a cursor is provided.",
        );
      }

      const decoded = decodeTransactionCursor(cursor);
      sliceLimit = decoded.limit;
      startIndex = items.findIndex(
        (item) =>
          item.createdAtMs < decoded.lastCreatedAtMs ||
          (item.createdAtMs === decoded.lastCreatedAtMs && item.id > decoded.lastId),
      );

      if (startIndex === -1) {
        startIndex = items.length;
      }
    }

    const pageItems = items.slice(startIndex, startIndex + sliceLimit);
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems.map((item) => buildTransactionFeedItem(item, subscriptionsById)),
      limit: sliceLimit,
      nextCursor:
        pageItems.length === sliceLimit && lastItem
          ? encodeTransactionCursor({
              limit: sliceLimit,
              lastCreatedAtMs: lastItem.createdAtMs,
              lastId: lastItem.id,
            })
          : null,
    };
  }

  return {
    getCurrentEventId() {
      return String(lastEventId);
    },

    getDashboardBootstrap(options = {}) {
      const snapshotEventId = String(lastEventId);
      const status = options.status ?? null;
      const subscriptions = buildSubscriptionSlice(
        getSortedSubscriptions(status),
        options.subscriptionLimit,
        status,
      );
      const transactionSlice = buildTransactionSlice(
        getSortedTransactions(),
        options.transactionLimit,
      );

      return {
        snapshotEventId,
        subscriptions,
        transactions: transactionSlice,
      };
    },

    listSubscriptions(options = {}) {
      const status = options.status ?? null;
      return buildSubscriptionSlice(
        getSortedSubscriptions(status),
        options.limit,
        status,
        options.cursor ?? null,
      );
    },

    listTransactions(options = {}) {
      return buildTransactionSlice(
        getSortedTransactions(),
        options.limit,
        options.cursor ?? null,
      );
    },

    createSubscription(input) {
      const normalized = validateCreateInput(input);
      const createdAtMs = deps.now();
      const subscription: SubscriptionRecord = {
        id: deps.createSubscriptionId(),
        planName: normalized.planName,
        amountCents: normalized.amountCents,
        currency: normalized.currency,
        status: "active",
        billingIntervalMs: normalized.billingIntervalMs,
        nextBillingAtMs: createdAtMs,
        pausedAtMs: null,
        pauseUntilMs: null,
        canceledAtMs: null,
        createdAtMs,
        updatedAtMs: createdAtMs,
      };
      const emittedEvents: StoredDomainEvent[] = [];

      const transaction = createTransactionRecord(subscription, createdAtMs);
      subscription.nextBillingAtMs = advanceToFirstFutureSlot(
        createdAtMs,
        createdAtMs,
        subscription.billingIntervalMs,
      );
      subscriptionsById.set(subscription.id, subscription);

      appendEvent(
        "subscription.created",
        { subscription: serializeSubscription(subscription) },
        createdAtMs,
        emittedEvents,
      );
      appendEvent(
        "transaction.created",
        { transaction: buildTransactionFeedItem(transaction, subscriptionsById) },
        createdAtMs,
        emittedEvents,
      );

      return {
        value: serializeSubscription(subscription),
        events: emittedEvents,
      };
    },

    pauseSubscription(id, input) {
      const subscription = requireSubscription(id);
      assertCanPause(subscription);
      const pauseSeconds = validatePauseInput(input);
      const nowMs = deps.now();
      const emittedEvents: StoredDomainEvent[] = [];

      subscription.status = "paused";
      subscription.pausedAtMs = nowMs;
      subscription.pauseUntilMs = pauseSeconds === null ? null : nowMs + pauseSeconds * 1_000;
      subscription.updatedAtMs = nowMs;

      appendEvent(
        "subscription.paused",
        { subscription: serializeSubscription(subscription) },
        nowMs,
        emittedEvents,
      );

      return {
        value: serializeSubscription(subscription),
        events: emittedEvents,
      };
    },

    resumeSubscription(id) {
      const subscription = requireSubscription(id);
      assertCanResume(subscription);
      const nowMs = deps.now();
      const emittedEvents: StoredDomainEvent[] = [];

      resumeSubscriptionRecord(subscription, nowMs, nowMs, emittedEvents);

      return {
        value: serializeSubscription(subscription),
        events: emittedEvents,
      };
    },

    cancelSubscription(id) {
      const subscription = requireSubscription(id);
      assertCanCancel(subscription);
      const nowMs = deps.now();
      const emittedEvents: StoredDomainEvent[] = [];

      subscription.status = "canceled";
      subscription.pausedAtMs = null;
      subscription.pauseUntilMs = null;
      subscription.canceledAtMs = nowMs;
      subscription.updatedAtMs = nowMs;

      appendEvent(
        "subscription.canceled",
        { subscription: serializeSubscription(subscription) },
        nowMs,
        emittedEvents,
      );

      return {
        value: serializeSubscription(subscription),
        events: emittedEvents,
      };
    },

    stepBilling(nowMs) {
      const emittedEvents: StoredDomainEvent[] = [];
      const subscriptions = Array.from(subscriptionsById.values()).sort((left, right) =>
        left.id.localeCompare(right.id),
      );

      for (const subscription of subscriptions) {
        if (
          subscription.status === "paused" &&
          subscription.pauseUntilMs !== null &&
          subscription.pauseUntilMs <= nowMs
        ) {
          resumeSubscriptionRecord(
            subscription,
            subscription.pauseUntilMs,
            subscription.pauseUntilMs,
            emittedEvents,
          );
        }
      }

      for (const subscription of subscriptions) {
        billSubscriptionIfDue(subscription, nowMs, emittedEvents);
      }

      return {
        events: emittedEvents,
      };
    },

    resolveReplaySince(eventId) {
      if (eventId === null || eventId === undefined || eventId === "") {
        return { events: [] };
      }

      const requestedId = parseEventId(eventId);

      if (requestedId > lastEventId) {
        throw new StoreError(
          "INVALID_EVENT_ID",
          "Requested event id is ahead of the current replay watermark.",
        );
      }

      if (requestedId === lastEventId) {
        return { events: [] };
      }

      if (replayBuffer.length === 0) {
        throw new StoreError(
          "REPLAY_EXPIRED",
          "The requested replay window is no longer available.",
        );
      }

      const firstRetainedId = replayBuffer[0].id;

      if (requestedId < firstRetainedId - 1) {
        throw new StoreError(
          "REPLAY_EXPIRED",
          "The requested replay window is no longer available.",
        );
      }

      return {
        events: replayBuffer.filter((event) => event.id > requestedId),
      };
    },
  };
}
