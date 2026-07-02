// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { DashboardBootstrap } from "../../../shared/subscriptions/types";
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
      <button type="button" onClick={() => void data.handleLoadMoreTransactions()}>
        Load transactions
      </button>
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
