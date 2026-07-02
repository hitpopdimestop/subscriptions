import { afterEach, beforeEach, expect, it } from "vitest";
import { POST as graphQLPost } from "../../app/api/graphql/route";
import { POST as createSubscriptionPost } from "../../app/api/subscriptions/route";
import { POST as pauseSubscriptionPost } from "../../app/api/subscriptions/[id]/pause/route";
import { POST as resumeSubscriptionPost } from "../../app/api/subscriptions/[id]/resume/route";
import { POST as cancelSubscriptionPost } from "../../app/api/subscriptions/[id]/cancel/route";
import { GET as streamGet } from "../../app/api/stream/route";
import {
  DASHBOARD_BOOTSTRAP_QUERY,
  SUBSCRIPTION_SLICE_QUERY,
  TRANSACTION_SLICE_QUERY,
} from "../../shared/subscriptions/graphql-documents";
import { getDashboardBootstrap } from "./get-dashboard-bootstrap";
import { createStoreRuntime, replaceStoreSingletonForTesting } from "./runtime";
import { createSeedState } from "./seed-data";
import { createStoreCore } from "./store-core";
import type { SeedState } from "../../shared/subscriptions/types";

function createIdFactory(prefix: string) {
  let current = 1;
  return () => `${prefix}_${String(current++).padStart(3, "0")}`;
}

function createTestRuntime(initialState?: SeedState, initialNowMs = 0) {
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

  const runtime = createStoreRuntime({
    core,
    clock: () => nowMs,
    startScheduler: false,
  });

  return {
    runtime,
    setNow(value: number) {
      nowMs = value;
    },
  };
}

function postJson(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readChunks(response: Response, maxChunks = 4) {
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  let output = "";

  for (let index = 0; index < maxChunks; index += 1) {
    const chunk = await reader!.read();

    if (chunk.done) {
      break;
    }

    output += chunk.value ? new TextDecoder().decode(chunk.value) : "";

    if (output.includes(": connected")) {
      break;
    }
  }

  await reader!.cancel();
  return output;
}

describe("transport adapters", () => {
  beforeEach(() => {
    replaceStoreSingletonForTesting();
  });

  afterEach(() => {
    replaceStoreSingletonForTesting();
  });

  it("serves the dashboard bootstrap query", async () => {
    const nowMs = Date.UTC(2026, 6, 2, 12, 0, 0, 0);
    const testRuntime = createTestRuntime(createSeedState(nowMs), nowMs);
    replaceStoreSingletonForTesting(testRuntime.runtime);

    const response = await graphQLPost(
      await postJson("/api/graphql", {
        query: DASHBOARD_BOOTSTRAP_QUERY,
        variables: {
          status: null,
          subscriptionLimit: 5,
          transactionLimit: 20,
        },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.dashboardBootstrap.snapshotEventId).toBe("0");
    expect(json.data.dashboardBootstrap.subscriptions.items).toHaveLength(5);
    expect(json.data.dashboardBootstrap.transactions.items.length).toBeGreaterThan(0);
  });

  it("supports cursor pagination for subscriptions and transactions", async () => {
    const nowMs = Date.UTC(2026, 6, 2, 12, 0, 0, 0);
    const testRuntime = createTestRuntime(createSeedState(nowMs), nowMs);
    replaceStoreSingletonForTesting(testRuntime.runtime);

    const subscriptionFirst = await graphQLPost(
      await postJson("/api/graphql", {
        query: SUBSCRIPTION_SLICE_QUERY,
        variables: {
          status: null,
          limit: 3,
          cursor: null,
        },
      }),
    );
    const subscriptionFirstJson = await subscriptionFirst.json();
    const subscriptionSecond = await graphQLPost(
      await postJson("/api/graphql", {
        query: SUBSCRIPTION_SLICE_QUERY,
        variables: {
          cursor: subscriptionFirstJson.data.subscriptions.nextCursor,
        },
      }),
    );
    const subscriptionSecondJson = await subscriptionSecond.json();

    expect(subscriptionFirstJson.data.subscriptions.items).toHaveLength(3);
    expect(subscriptionSecondJson.data.subscriptions.items).toHaveLength(3);
    expect(
      new Set([
        ...subscriptionFirstJson.data.subscriptions.items.map((item: { id: string }) => item.id),
        ...subscriptionSecondJson.data.subscriptions.items.map((item: { id: string }) => item.id),
      ]).size,
    ).toBe(6);

    const transactionFirst = await graphQLPost(
      await postJson("/api/graphql", {
        query: TRANSACTION_SLICE_QUERY,
        variables: {
          limit: 4,
          cursor: null,
        },
      }),
    );
    const transactionFirstJson = await transactionFirst.json();
    const transactionSecond = await graphQLPost(
      await postJson("/api/graphql", {
        query: TRANSACTION_SLICE_QUERY,
        variables: {
          cursor: transactionFirstJson.data.transactions.nextCursor,
        },
      }),
    );
    const transactionSecondJson = await transactionSecond.json();

    expect(transactionFirstJson.data.transactions.items).toHaveLength(4);
    expect(transactionSecondJson.data.transactions.items).toHaveLength(4);
  });

  it("returns a snapshot watermark that matches the current live event id", async () => {
    const testRuntime = createTestRuntime();
    replaceStoreSingletonForTesting(testRuntime.runtime);

    testRuntime.runtime.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    const response = await graphQLPost(
      await postJson("/api/graphql", {
        query: DASHBOARD_BOOTSTRAP_QUERY,
        variables: {
          status: null,
          subscriptionLimit: 5,
          transactionLimit: 20,
        },
      }),
    );
    const json = await response.json();

    expect(json.data.dashboardBootstrap.snapshotEventId).toBe(
      testRuntime.runtime.core.getCurrentEventId(),
    );
    expect(json.data.dashboardBootstrap.transactions.items[0].planName).toBe("Starter");
  });

  it("returns the same bootstrap shape through the direct server helper", async () => {
    const nowMs = Date.UTC(2026, 6, 2, 12, 0, 0, 0);
    const testRuntime = createTestRuntime(createSeedState(nowMs), nowMs);
    replaceStoreSingletonForTesting(testRuntime.runtime);

    const bootstrap = await getDashboardBootstrap();

    expect(bootstrap.snapshotEventId).toBe("0");
    expect(Object.getPrototypeOf(bootstrap)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(bootstrap.subscriptions)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(bootstrap.transactions)).toBe(Object.prototype);
    expect(bootstrap.subscriptions.items).toHaveLength(5);
    expect(bootstrap.transactions.items.length).toBeGreaterThan(0);
  });

  it("supports an active-only bootstrap slice through the direct server helper", async () => {
    const nowMs = Date.UTC(2026, 6, 2, 12, 0, 0, 0);
    const testRuntime = createTestRuntime(createSeedState(nowMs), nowMs);
    replaceStoreSingletonForTesting(testRuntime.runtime);

    const bootstrap = await getDashboardBootstrap("ACTIVE");

    expect(
      bootstrap.subscriptions.items.every(
        (subscription) => subscription.status === "active",
      ),
    ).toBe(true);
  });

  it("returns command route success bodies", async () => {
    const testRuntime = createTestRuntime();
    replaceStoreSingletonForTesting(testRuntime.runtime);

    const createdResponse = await createSubscriptionPost(
      await postJson("/api/subscriptions", {
        planName: "Starter",
        amountCents: 1299,
        currency: "USD",
        billingIntervalMs: 2000,
      }),
    );
    const createdJson = await createdResponse.json();

    expect(createdResponse.status).toBe(201);
    expect(createdJson.subscription.planName).toBe("Starter");

    const pauseResponse = await pauseSubscriptionPost(
      await postJson(`/api/subscriptions/${createdJson.subscription.id}/pause`, {
        pauseSeconds: 5,
      }),
      { params: Promise.resolve({ id: createdJson.subscription.id }) },
    );
    const pauseJson = await pauseResponse.json();

    expect(pauseResponse.status).toBe(200);
    expect(pauseJson.subscription.status).toBe("paused");

    const resumeResponse = await resumeSubscriptionPost(
      new Request(`http://localhost/api/subscriptions/${createdJson.subscription.id}/resume`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: createdJson.subscription.id }) },
    );
    const resumeJson = await resumeResponse.json();

    expect(resumeJson.subscription.status).toBe("active");

    const cancelResponse = await cancelSubscriptionPost(
      new Request(`http://localhost/api/subscriptions/${createdJson.subscription.id}/cancel`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: createdJson.subscription.id }) },
    );
    const cancelJson = await cancelResponse.json();

    expect(cancelJson.subscription.status).toBe("canceled");
  });

  it("maps command conflicts to the documented error envelope", async () => {
    const testRuntime = createTestRuntime();
    replaceStoreSingletonForTesting(testRuntime.runtime);
    const created = testRuntime.runtime.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    testRuntime.runtime.pauseSubscription(created.value.id, {});

    const response = await pauseSubscriptionPost(
      await postJson(`/api/subscriptions/${created.value.id}/pause`, {}),
      { params: Promise.resolve({ id: created.value.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.code).toBe("SUBSCRIPTION_ALREADY_PAUSED");
    expect(json.error.subscription.id).toBe(created.value.id);
  });

  it("replays buffered events from sinceEventId", async () => {
    const testRuntime = createTestRuntime();
    replaceStoreSingletonForTesting(testRuntime.runtime);
    testRuntime.runtime.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    const response = await streamGet(
      new Request("http://localhost/api/stream?sinceEventId=0"),
    );
    const chunk = await readChunks(response);

    expect(response.status).toBe(200);
    expect(chunk).toContain("event: subscription.created");
    expect(chunk).toContain("event: transaction.created");
  });

  it("prefers Last-Event-ID over sinceEventId", async () => {
    const testRuntime = createTestRuntime();
    replaceStoreSingletonForTesting(testRuntime.runtime);
    testRuntime.runtime.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    const currentEventId = testRuntime.runtime.core.getCurrentEventId();
    const response = await streamGet(
      new Request(`http://localhost/api/stream?sinceEventId=0`, {
        headers: {
          "Last-Event-ID": currentEventId,
        },
      }),
    );
    const chunk = await readChunks(response);

    expect(chunk).not.toContain("event:");
    expect(chunk).toContain(": connected");
  });

  it("returns replay-expired and invalid-future-event errors from the stream route", async () => {
    const core = createStoreCore(
      {
        now: () => 0,
        createSubscriptionId: createIdFactory("sub"),
        createTransactionId: createIdFactory("txn"),
      },
      {
        replayConfig: {
          maxAgeMs: 60_000,
          maxEvents: 2,
        },
      },
    );
    const runtime = createStoreRuntime({
      core,
      startScheduler: false,
    });
    replaceStoreSingletonForTesting(runtime);

    runtime.createSubscription({
      planName: "Starter",
      amountCents: 1299,
      currency: "USD",
      billingIntervalMs: 2000,
    });
    runtime.createSubscription({
      planName: "Pro",
      amountCents: 2499,
      currency: "USD",
      billingIntervalMs: 2000,
    });

    const replayExpired = await streamGet(
      new Request("http://localhost/api/stream?sinceEventId=0"),
    );
    const replayExpiredJson = await replayExpired.json();

    expect(replayExpired.status).toBe(409);
    expect(replayExpiredJson.error.code).toBe("REPLAY_EXPIRED");

    const invalidFuture = await streamGet(
      new Request("http://localhost/api/stream?sinceEventId=999"),
    );
    const invalidFutureJson = await invalidFuture.json();

    expect(invalidFuture.status).toBe(409);
    expect(invalidFutureJson.error.code).toBe("INVALID_EVENT_ID");
  });
});
