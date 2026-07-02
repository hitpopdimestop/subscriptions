import { afterEach, expect, it, vi } from "vitest";
import {
  DEFAULT_SUBSCRIPTION_LIMIT,
  DEFAULT_TRANSACTION_LIMIT,
} from "../../shared/subscriptions/constants";
import { fetchSubscriptionSlice, fetchTransactionSlice } from "./client";

function createJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("uses shared default limits for the initial subscription slice request", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    createJsonResponse({
      data: {
        subscriptions: {
          items: [],
          limit: DEFAULT_SUBSCRIPTION_LIMIT,
          nextCursor: null,
        },
      },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await fetchSubscriptionSlice("active");

  expect(fetchMock).toHaveBeenCalledTimes(1);

  const [, init] = fetchMock.mock.calls[0]!;
  const body = JSON.parse(String(init?.body)) as {
    variables: {
      status: string | null;
      limit: number;
      cursor: null;
    };
  };

  expect(body.variables).toEqual({
    status: "ACTIVE",
    limit: DEFAULT_SUBSCRIPTION_LIMIT,
    cursor: null,
  });
});

it("uses the shared default limit for the initial transaction slice request", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    createJsonResponse({
      data: {
        transactions: {
          items: [],
          limit: DEFAULT_TRANSACTION_LIMIT,
          nextCursor: null,
        },
      },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await fetchTransactionSlice();

  expect(fetchMock).toHaveBeenCalledTimes(1);

  const [, init] = fetchMock.mock.calls[0]!;
  const body = JSON.parse(String(init?.body)) as {
    variables: {
      limit: number;
      cursor: null;
    };
  };

  expect(body.variables).toEqual({
    limit: DEFAULT_TRANSACTION_LIMIT,
    cursor: null,
  });
});
