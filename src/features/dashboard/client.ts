"use client";

import {
  DEFAULT_SUBSCRIPTION_LIMIT,
  DEFAULT_TRANSACTION_LIMIT,
} from "../../shared/subscriptions/constants";
import {
  SUBSCRIPTION_SLICE_QUERY,
  TRANSACTION_SLICE_QUERY,
  type SubscriptionSliceResult,
  type TransactionSliceResult,
} from "../../shared/subscriptions/graphql-documents";
import type {
  CreateSubscriptionInput,
  Subscription,
  SubscriptionFilterStatus,
} from "../../shared/subscriptions/types";
import type { SubscriptionFilterValue } from "./types";

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    subscription?: Subscription;
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as unknown;

  if (!response.ok) {
    if (
      typeof json === "object" &&
      json !== null &&
      "error" in json
    ) {
      const errorJson = json as ErrorEnvelope;
      throw new Error(errorJson.error.message);
    }

    throw new Error("Request failed.");
  }

  return json as T;
}

async function postJson<T>(
  url: string,
  body: Record<string, unknown> | CreateSubscriptionInput,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return readJson<T>(response);
}

function mapFilterToStatus(
  filter: SubscriptionFilterValue,
): SubscriptionFilterStatus | null {
  return filter === "active" ? "ACTIVE" : null;
}

export async function fetchSubscriptionSlice(
  filter: SubscriptionFilterValue,
  cursor?: string | null,
) {
  const response = await postJson<{
    data: SubscriptionSliceResult;
  }>("/api/graphql", {
    query: SUBSCRIPTION_SLICE_QUERY,
    variables: cursor
      ? { cursor }
      : {
          status: mapFilterToStatus(filter),
          limit: DEFAULT_SUBSCRIPTION_LIMIT,
          cursor: null,
        },
  });

  return response.data.subscriptions;
}

export async function fetchTransactionSlice(cursor?: string | null) {
  const response = await postJson<{
    data: TransactionSliceResult;
  }>("/api/graphql", {
    query: TRANSACTION_SLICE_QUERY,
    variables: cursor
      ? { cursor }
      : {
          limit: DEFAULT_TRANSACTION_LIMIT,
          cursor: null,
        },
  });

  return response.data.transactions;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  return postJson<{ subscription: Subscription }>("/api/subscriptions", input);
}

export async function pauseSubscription(
  id: string,
  pauseSeconds?: number | null,
) {
  return postJson<{ subscription: Subscription }>(
    `/api/subscriptions/${id}/pause`,
    pauseSeconds === null || pauseSeconds === undefined
      ? {}
      : { pauseSeconds },
  );
}

export async function resumeSubscription(id: string) {
  return postJson<{ subscription: Subscription }>(
    `/api/subscriptions/${id}/resume`,
    {},
  );
}

export async function cancelSubscription(id: string) {
  return postJson<{ subscription: Subscription }>(
    `/api/subscriptions/${id}/cancel`,
    {},
  );
}
