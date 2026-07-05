// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type {
  DashboardBootstrap,
  Subscription,
} from "../../../shared/subscriptions/types";
import { useDashboardData } from "./use-dashboard-data";

function createBootstrap(): DashboardBootstrap {
  return {
    snapshotEventId: "0",
    subscriptions: {
      items: [],
      limit: 5,
      nextCursor: "cursor_sub_1",
    },
    transactions: {
      items: [],
      limit: 20,
      nextCursor: "cursor_txn_1",
    },
  };
}

function createJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createSubscription(id: string): Subscription {
  return {
    id,
    planName: `Plan ${id}`,
    amountCents: 1299,
    currency: "USD",
    status: "active",
    billingIntervalMs: 2000,
    nextBillingAt: new Date(2_000).toISOString(),
    pausedAt: null,
    pauseUntil: null,
    canceledAt: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function Harness({ bootstrap }: { bootstrap: DashboardBootstrap }) {
  const data = useDashboardData({
    bootstrap,
    offlineMode: true,
    initialFilter: "all",
  });

  return (
    <>
      <button type="button" onClick={() => void data.handleLoadMoreSubscriptions()}>
        Load subscriptions
      </button>
      <button type="button" onClick={() => void data.handleFilterChange("active")}>
        Filter active
      </button>
      <button type="button" onClick={() => void data.handleLoadMoreTransactions()}>
        Load transactions
      </button>
      <output data-testid="subscription-ids">
        {data.state.subscriptions.map((subscription) => subscription.id).join(",")}
      </output>
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("does not start the same subscription page request twice while the cursor is already loading", async () => {
  let resolveResponse: ((value: Response) => void) | null = null;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);

  render(<Harness bootstrap={createBootstrap()} />);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Load subscriptions" }));
    fireEvent.click(screen.getByRole("button", { name: "Load subscriptions" }));
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);

  resolveResponse?.(
    createJsonResponse({
      data: {
        subscriptions: {
          items: [],
          limit: 5,
          nextCursor: null,
        },
      },
    }),
  );
});

it("does not start the same transaction page request twice while the cursor is already loading", async () => {
  let resolveResponse: ((value: Response) => void) | null = null;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);

  render(<Harness bootstrap={createBootstrap()} />);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Load transactions" }));
    fireEvent.click(screen.getByRole("button", { name: "Load transactions" }));
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);

  resolveResponse?.(
    createJsonResponse({
      data: {
        transactions: {
          items: [],
          limit: 20,
          nextCursor: null,
        },
      },
    }),
  );
});

it("ignores a stale subscription load-more response after the filter refresh replaces the list", async () => {
  let resolveLoadMore: ((value: Response) => void) | null = null;
  let resolveFilterRefresh: ((value: Response) => void) | null = null;
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveLoadMore = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFilterRefresh = resolve;
        }),
    );
  vi.stubGlobal("fetch", fetchMock);

  const bootstrap: DashboardBootstrap = {
    ...createBootstrap(),
    subscriptions: {
      items: [createSubscription("sub_bootstrap")],
      limit: 5,
      nextCursor: "cursor_sub_1",
    },
  };

  render(<Harness bootstrap={bootstrap} />);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Load subscriptions" }));
    fireEvent.click(screen.getByRole("button", { name: "Filter active" }));
  });

  expect(fetchMock).toHaveBeenCalledTimes(2);

  await act(async () => {
    resolveFilterRefresh?.(
      createJsonResponse({
        data: {
          subscriptions: {
            items: [createSubscription("sub_active")],
            limit: 5,
            nextCursor: null,
          },
        },
      }),
    );
    await Promise.resolve();
  });

  await waitFor(() => {
    expect(screen.getByTestId("subscription-ids").textContent).toBe("sub_active");
  });

  await act(async () => {
    resolveLoadMore?.(
      createJsonResponse({
        data: {
          subscriptions: {
            items: [createSubscription("sub_stale_page")],
            limit: 5,
            nextCursor: null,
          },
        },
      }),
    );
    await Promise.resolve();
  });

  expect(screen.getByTestId("subscription-ids").textContent).toBe("sub_active");
});
