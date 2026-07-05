import { createSeedState } from "./seed-data";
import { StoreError } from "./errors";
import { createStoreCore } from "./store-core";
import type { SeedState } from "../../shared/subscriptions/types";

function createIdFactory(prefix: string) {
  let current = 1;
  return () => `${prefix}_${String(current++).padStart(3, "0")}`;
}

function createTestStore(initialNowMs = 0, initialState?: SeedState) {
  let nowMs = initialNowMs;

  const core = createStoreCore(
    {
      now: () => nowMs,
      createSubscriptionId: createIdFactory("sub"),
      createTransactionId: createIdFactory("txn"),
    },
    {
      initialState,
      replayConfig: {
        maxAgeMs: 60_000,
        maxEvents: 1_000,
      },
    },
  );

  return {
    core,
    setNow(value: number) {
      nowMs = value;
    },
  };
}

function toMs(value: string | null) {
  return value === null ? null : Date.parse(value);
}

describe("createStoreCore", () => {
  it("keeps seeded demo data without emitting synthetic replay events", () => {
    const nowMs = Date.UTC(2026, 6, 2, 12, 0, 0, 0);
    const store = createTestStore(nowMs, createSeedState(nowMs));
    const subscriptions = store.core.listSubscriptions({ limit: 20 });
    const transactions = store.core.listTransactions({ limit: 20 });

    expect(subscriptions.items).toHaveLength(8);
    expect(transactions.items).toHaveLength(10);
    expect(subscriptions.items.some((item) => item.status === "active")).toBe(true);
    expect(subscriptions.items.some((item) => item.status === "paused")).toBe(true);
    expect(subscriptions.items.some((item) => item.status === "canceled")).toBe(true);
    expect(store.core.getCurrentEventId()).toBe("0");
  });

  it("creates a subscription with an immediate first charge", () => {
    const store = createTestStore();
    const result = store.core.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "usd",
      billingIntervalMs: 2000,
    });
    const transactions = store.core.listTransactions({ limit: 20 });

    expect(result.value.status).toBe("active");
    expect(toMs(result.value.nextBillingAt)).toBe(2000);
    expect(transactions.items[0]).toMatchObject({
      subscriptionId: result.value.id,
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "subscription.created",
      "transaction.created",
    ]);
  });

  it("supports indefinite and timed pause", () => {
    const store = createTestStore();
    const created = store.core.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    store.setNow(200);
    const indefinite = store.core.pauseSubscription(created.value.id, {});

    expect(indefinite.value.status).toBe("paused");
    expect(indefinite.value.pausedAt).toBe(new Date(200).toISOString());
    expect(indefinite.value.pauseUntil).toBeNull();

    const timedStore = createTestStore();
    const timedCreated = timedStore.core.createSubscription({
      planName: "Pro",
      amountCents: 2499,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    timedStore.setNow(300);
    const timedPause = timedStore.core.pauseSubscription(timedCreated.value.id, {
      pauseSeconds: 5,
    });

    expect(timedPause.value.pauseUntil).toBe(new Date(5300).toISOString());
  });

  it("shifts nextBillingAt by the actual paused duration on manual resume", () => {
    const store = createTestStore();
    const created = store.core.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    store.setNow(100);
    store.core.pauseSubscription(created.value.id, {
      pauseSeconds: 10,
    });

    store.setNow(600);
    const resumed = store.core.resumeSubscription(created.value.id);

    expect(resumed.value.status).toBe("active");
    expect(resumed.value.pausedAt).toBeNull();
    expect(resumed.value.pauseUntil).toBeNull();
    expect(toMs(resumed.value.nextBillingAt)).toBe(2500);
    expect(resumed.events.map((event) => event.type)).toEqual([
      "subscription.resumed",
    ]);
  });

  it("auto-resumes timed pauses using pauseUntil as the effective resume time", () => {
    const store = createTestStore();
    const created = store.core.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    store.setNow(100);
    store.core.pauseSubscription(created.value.id, {
      pauseSeconds: 1,
    });

    const billed = store.core.stepBilling(1200);
    const subscription = store.core.listSubscriptions({ limit: 10 }).items[0];

    expect(subscription.status).toBe("active");
    expect(toMs(subscription.nextBillingAt)).toBe(3000);
    expect(billed.events.map((event) => event.type)).toEqual([
      "subscription.resumed",
    ]);
  });

  it("cancels immediately and clears pause state", () => {
    const store = createTestStore();
    const created = store.core.createSubscription({
      planName: "Scale",
      amountCents: 7999,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    store.setNow(250);
    store.core.pauseSubscription(created.value.id, {
      pauseSeconds: 5,
    });

    store.setNow(300);
    const canceled = store.core.cancelSubscription(created.value.id);

    expect(canceled.value.status).toBe("canceled");
    expect(canceled.value.pausedAt).toBeNull();
    expect(canceled.value.pauseUntil).toBeNull();
    expect(canceled.value.canceledAt).toBe(new Date(300).toISOString());
  });

  it("rejects invalid lifecycle transitions", () => {
    const store = createTestStore();
    const created = store.core.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    store.setNow(100);
    store.core.pauseSubscription(created.value.id, {});

    expect(() => store.core.pauseSubscription(created.value.id, {})).toThrowError(
      StoreError,
    );
    expect(() => store.core.resumeSubscription("missing")).toThrowError(StoreError);
    expect(() => store.core.cancelSubscription("missing")).toThrowError(StoreError);

    store.setNow(200);
    store.core.cancelSubscription(created.value.id);

    expect(() => store.core.resumeSubscription(created.value.id)).toThrowError(
      StoreError,
    );
    expect(() => store.core.cancelSubscription(created.value.id)).toThrowError(
      StoreError,
    );
  });

  it("accepts billing intervals up to 10000 ms and rejects values above that range", () => {
    const store = createTestStore();
    const accepted = store.core.createSubscription({
      planName: "Slow demo",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 10000,
    });

    expect(toMs(accepted.value.nextBillingAt)).toBe(10000);

    expect(() =>
      store.core.createSubscription({
        planName: "Too slow",
        amountCents: 1299,
        currency: "USD",
        billingIntervalMs: 10001,
      }),
    ).toThrowError(StoreError);
  });

  it("creates at most one successful transaction per billing step and keeps the fixed grid", () => {
    const store = createTestStore();
    const created = store.core.createSubscription({
      planName: "Growth",
      amountCents: 3599,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    const step = store.core.stepBilling(5500);
    const transactions = store.core.listTransactions({ limit: 20 });
    const subscription = store.core.listSubscriptions({ limit: 10 }).items.find(
      (item) => item.id === created.value.id,
    );

    expect(step.events.map((event) => event.type)).toEqual([
      "transaction.created",
      "subscription.updated",
    ]);
    expect(transactions.items).toHaveLength(2);
    expect(toMs(subscription?.nextBillingAt ?? null)).toBe(6000);
  });

  it("resumes before billing in the same scheduler step", () => {
    const store = createTestStore();
    const created = store.core.createSubscription({
      planName: "Studio",
      amountCents: 2799,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    store.setNow(1900);
    store.core.pauseSubscription(created.value.id, {
      pauseSeconds: 1,
    });

    const step = store.core.stepBilling(3000);
    const subscription = store.core.listSubscriptions({ limit: 10 }).items.find(
      (item) => item.id === created.value.id,
    );

    expect(step.events.map((event) => event.type)).toEqual([
      "subscription.resumed",
      "transaction.created",
      "subscription.updated",
    ]);
    expect(toMs(subscription?.nextBillingAt ?? null)).toBe(5000);
  });

  it("returns replay resolution errors as data when the caller wants to handle them without throwing", () => {
    const invalidFutureStore = createTestStore();
    invalidFutureStore.core.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    const invalidFutureReplay = invalidFutureStore.core.tryResolveReplaySince("99");

    expect(invalidFutureReplay.ok).toBe(false);
    if (invalidFutureReplay.ok) {
      throw new Error("Expected invalidFutureReplay to be an error result.");
    }
    expect(invalidFutureReplay.error.code).toBe("INVALID_EVENT_ID");

    const replayExpiredCore = createStoreCore(
      {
        now: () => 0,
        createSubscriptionId: createIdFactory("sub"),
        createTransactionId: createIdFactory("txn"),
      },
      {
        replayConfig: {
          maxAgeMs: 60_000,
          maxEvents: 1,
        },
      },
    );

    replayExpiredCore.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    const replayExpired = replayExpiredCore.tryResolveReplaySince("0");

    expect(replayExpired.ok).toBe(false);
    if (replayExpired.ok) {
      throw new Error("Expected replayExpired to be an error result.");
    }
    expect(replayExpired.error.code).toBe("REPLAY_EXPIRED");
  });
});
