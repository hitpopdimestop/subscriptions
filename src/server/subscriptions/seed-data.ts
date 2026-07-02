import type {
  SeedState,
  SubscriptionRecord,
  TransactionRecord,
} from "../../shared/subscriptions/types";

function createSubscription(
  values: Omit<SubscriptionRecord, "currency"> & { currency?: string },
): SubscriptionRecord {
  return {
    currency: "USD",
    ...values,
  };
}

function createTransaction(
  values: Omit<TransactionRecord, "currency"> & { currency?: string },
): TransactionRecord {
  return {
    currency: "USD",
    ...values,
  };
}

export function createSeedState(nowMs: number): SeedState {
  const subscriptions: SubscriptionRecord[] = [
    createSubscription({
      id: "sub_001",
      planName: "Starter",
      amountCents: 1299,
      status: "active",
      billingIntervalMs: 1_500,
      nextBillingAtMs: nowMs + 1_150,
      pausedAtMs: null,
      pauseUntilMs: null,
      canceledAtMs: null,
      createdAtMs: nowMs - 8_000,
      updatedAtMs: nowMs - 2_000,
    }),
    createSubscription({
      id: "sub_002",
      planName: "Pro",
      amountCents: 2499,
      status: "active",
      billingIntervalMs: 1_750,
      nextBillingAtMs: nowMs + 1_400,
      pausedAtMs: null,
      pauseUntilMs: null,
      canceledAtMs: null,
      createdAtMs: nowMs - 7_000,
      updatedAtMs: nowMs - 1_900,
    }),
    createSubscription({
      id: "sub_003",
      planName: "Team",
      amountCents: 4999,
      status: "paused",
      billingIntervalMs: 2_000,
      nextBillingAtMs: nowMs + 1_650,
      pausedAtMs: nowMs - 300,
      pauseUntilMs: nowMs + 2_700,
      canceledAtMs: null,
      createdAtMs: nowMs - 6_000,
      updatedAtMs: nowMs - 300,
    }),
    createSubscription({
      id: "sub_004",
      planName: "Scale",
      amountCents: 7999,
      status: "paused",
      billingIntervalMs: 2_250,
      nextBillingAtMs: nowMs + 2_250,
      pausedAtMs: nowMs - 5_000,
      pauseUntilMs: null,
      canceledAtMs: null,
      createdAtMs: nowMs - 5_000,
      updatedAtMs: nowMs - 5_000,
    }),
    createSubscription({
      id: "sub_005",
      planName: "Growth",
      amountCents: 3599,
      status: "active",
      billingIntervalMs: 2_500,
      nextBillingAtMs: nowMs + 1_900,
      pausedAtMs: null,
      pauseUntilMs: null,
      canceledAtMs: null,
      createdAtMs: nowMs - 4_000,
      updatedAtMs: nowMs - 1_800,
    }),
    createSubscription({
      id: "sub_006",
      planName: "Enterprise",
      amountCents: 9999,
      status: "canceled",
      billingIntervalMs: 3_000,
      nextBillingAtMs: nowMs + 3_000,
      pausedAtMs: null,
      pauseUntilMs: null,
      canceledAtMs: nowMs - 1_200,
      createdAtMs: nowMs - 3_000,
      updatedAtMs: nowMs - 1_200,
    }),
    createSubscription({
      id: "sub_007",
      planName: "Launch",
      amountCents: 1899,
      status: "active",
      billingIntervalMs: 2_800,
      nextBillingAtMs: nowMs + 2_200,
      pausedAtMs: null,
      pauseUntilMs: null,
      canceledAtMs: null,
      createdAtMs: nowMs - 2_000,
      updatedAtMs: nowMs - 1_500,
    }),
    createSubscription({
      id: "sub_008",
      planName: "Studio",
      amountCents: 2799,
      status: "active",
      billingIntervalMs: 3_000,
      nextBillingAtMs: nowMs + 2_650,
      pausedAtMs: null,
      pauseUntilMs: null,
      canceledAtMs: null,
      createdAtMs: nowMs - 1_000,
      updatedAtMs: nowMs - 1_000,
    }),
  ];

  const transactions: TransactionRecord[] = [
    createTransaction({
      id: "txn_001",
      subscriptionId: "sub_001",
      amountCents: 1299,
      createdAtMs: nowMs - 4_500,
    }),
    createTransaction({
      id: "txn_002",
      subscriptionId: "sub_002",
      amountCents: 2499,
      createdAtMs: nowMs - 4_000,
    }),
    createTransaction({
      id: "txn_003",
      subscriptionId: "sub_003",
      amountCents: 4999,
      createdAtMs: nowMs - 3_700,
    }),
    createTransaction({
      id: "txn_004",
      subscriptionId: "sub_004",
      amountCents: 7999,
      createdAtMs: nowMs - 3_300,
    }),
    createTransaction({
      id: "txn_005",
      subscriptionId: "sub_005",
      amountCents: 3599,
      createdAtMs: nowMs - 2_900,
    }),
    createTransaction({
      id: "txn_006",
      subscriptionId: "sub_006",
      amountCents: 9999,
      createdAtMs: nowMs - 2_600,
    }),
    createTransaction({
      id: "txn_007",
      subscriptionId: "sub_007",
      amountCents: 1899,
      createdAtMs: nowMs - 2_200,
    }),
    createTransaction({
      id: "txn_008",
      subscriptionId: "sub_008",
      amountCents: 2799,
      createdAtMs: nowMs - 1_800,
    }),
    createTransaction({
      id: "txn_009",
      subscriptionId: "sub_001",
      amountCents: 1299,
      createdAtMs: nowMs - 1_200,
    }),
    createTransaction({
      id: "txn_010",
      subscriptionId: "sub_005",
      amountCents: 3599,
      createdAtMs: nowMs - 600,
    }),
  ];

  return {
    subscriptions,
    transactions,
  };
}
