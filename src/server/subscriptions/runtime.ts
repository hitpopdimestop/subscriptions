import { DEFAULT_BILLING_LOOP_INTERVAL_MS } from "./constants";
import { createSeedState } from "./seed-data";
import { createStoreCore, type StoreCore } from "./store-core";
import type {
  BillingStepResult,
  CreateSubscriptionInput,
  MutationResult,
  PauseSubscriptionInput,
  StoredDomainEvent,
  Subscription,
} from "../../shared/subscriptions/types";

type EventListener = (event: StoredDomainEvent) => void;

interface CreateStoreRuntimeOptions {
  billingLoopIntervalMs?: number;
  clock?: () => number;
  core: StoreCore;
  startScheduler?: boolean;
}

export interface StoreRuntime {
  core: StoreCore;
  subscribe(listener: EventListener): () => void;
  createSubscription(input: CreateSubscriptionInput): MutationResult<Subscription>;
  pauseSubscription(id: string, input?: PauseSubscriptionInput): MutationResult<Subscription>;
  resumeSubscription(id: string): MutationResult<Subscription>;
  cancelSubscription(id: string): MutationResult<Subscription>;
  stepBilling(nowMs?: number): BillingStepResult;
  shutdown(): void;
}

declare global {
  var __subscriptionsStoreRuntime: StoreRuntime | undefined;
}

function fanOutEvents(listeners: Set<EventListener>, events: StoredDomainEvent[]) {
  for (const event of events) {
    for (const listener of listeners) {
      listener(event);
    }
  }
}

function readIntegerEnv(name: string): number | undefined {
  const rawValue = process.env[name];

  if (!rawValue) {
    return undefined;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : undefined;
}

function createIdFactory(prefix: string, startAt: number) {
  let current = startAt;

  return () => `${prefix}_${String(current++).padStart(3, "0")}`;
}

function getNextCounter(seedIds: string[], prefix: string): number {
  let maxValue = 0;

  for (const id of seedIds) {
    const match = id.match(new RegExp(`^${prefix}_(\\d+)$`));
    if (!match) {
      continue;
    }

    maxValue = Math.max(maxValue, Number(match[1]));
  }

  return maxValue + 1;
}

export function createStoreRuntime(options: CreateStoreRuntimeOptions): StoreRuntime {
  const listeners = new Set<EventListener>();
  const clock = options.clock ?? Date.now;
  const billingLoopIntervalMs =
    options.billingLoopIntervalMs ?? DEFAULT_BILLING_LOOP_INTERVAL_MS;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function broadcast(events: StoredDomainEvent[]) {
    if (events.length === 0) {
      return;
    }

    fanOutEvents(listeners, events);
  }

  const runtime: StoreRuntime = {
    core: options.core,

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    createSubscription(input) {
      const result = options.core.createSubscription(input);
      broadcast(result.events);
      return result;
    },

    pauseSubscription(id, input) {
      const result = options.core.pauseSubscription(id, input);
      broadcast(result.events);
      return result;
    },

    resumeSubscription(id) {
      const result = options.core.resumeSubscription(id);
      broadcast(result.events);
      return result;
    },

    cancelSubscription(id) {
      const result = options.core.cancelSubscription(id);
      broadcast(result.events);
      return result;
    },

    stepBilling(nowMs = clock()) {
      const result = options.core.stepBilling(nowMs);
      broadcast(result.events);
      return result;
    },

    shutdown() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }

      listeners.clear();
    },
  };

  if (options.startScheduler !== false) {
    intervalId = setInterval(() => {
      runtime.stepBilling(clock());
    }, billingLoopIntervalMs);
    intervalId.unref?.();
  }

  return runtime;
}

export function createProductionStoreRuntime(): StoreRuntime {
  const nowMs = Date.now();
  const seedState = createSeedState(nowMs);
  const subscriptionCounter = getNextCounter(
    seedState.subscriptions.map((subscription) => subscription.id),
    "sub",
  );
  const transactionCounter = getNextCounter(
    seedState.transactions.map((transaction) => transaction.id),
    "txn",
  );

  const core = createStoreCore(
    {
      now: () => Date.now(),
      createSubscriptionId: createIdFactory("sub", subscriptionCounter),
      createTransactionId: createIdFactory("txn", transactionCounter),
    },
    {
      initialState: seedState,
      replayConfig: {
        maxAgeMs: readIntegerEnv("SUBSCRIPTIONS_REPLAY_MAX_AGE_MS"),
        maxEvents: readIntegerEnv("SUBSCRIPTIONS_REPLAY_MAX_EVENTS"),
      },
    },
  );

  return createStoreRuntime({
    billingLoopIntervalMs: readIntegerEnv("SUBSCRIPTIONS_BILLING_LOOP_INTERVAL_MS"),
    core,
  });
}

export function getStoreSingleton(): StoreRuntime {
  if (!globalThis.__subscriptionsStoreRuntime) {
    globalThis.__subscriptionsStoreRuntime = createProductionStoreRuntime();
  }

  return globalThis.__subscriptionsStoreRuntime;
}

export function replaceStoreSingletonForTesting(runtime?: StoreRuntime) {
  globalThis.__subscriptionsStoreRuntime?.shutdown();

  if (runtime) {
    globalThis.__subscriptionsStoreRuntime = runtime;
  } else {
    delete globalThis.__subscriptionsStoreRuntime;
  }
}
