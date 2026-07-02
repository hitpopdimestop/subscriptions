// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, vi } from "vitest";
import { Dashboard } from "./dashboard";
import type {
  DashboardBootstrap,
  Subscription,
  TransactionFeedItem,
} from "../../shared/subscriptions/types";

class FakeIntersectionObserver {
  observe() {}
  disconnect() {}
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly url: string;
  readonly listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();
  closed = false;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown, lastEventId: string) {
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener({
        data: JSON.stringify(data),
        lastEventId,
        type,
      } as MessageEvent<string>);
    }
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }
}

function createBootstrap(): DashboardBootstrap {
  return {
    snapshotEventId: "2",
    subscriptions: {
      items: [
        {
          id: "sub_001",
          planName: "Starter",
          amountCents: 1299,
          currency: "USD",
          status: "active",
          billingIntervalMs: 2000,
          nextBillingAt: new Date(2000).toISOString(),
          pausedAt: null,
          pauseUntil: null,
          canceledAt: null,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
        {
          id: "sub_002",
          planName: "Growth",
          amountCents: 3599,
          currency: "USD",
          status: "active",
          billingIntervalMs: 2500,
          nextBillingAt: new Date(3000).toISOString(),
          pausedAt: null,
          pauseUntil: null,
          canceledAt: null,
          createdAt: new Date(100).toISOString(),
          updatedAt: new Date(100).toISOString(),
        },
      ],
      limit: 5,
      nextCursor: null,
    },
    transactions: {
      items: [
        {
          id: "txn_001",
          subscriptionId: "sub_001",
          planName: "Starter",
          amountCents: 1299,
          currency: "USD",
          createdAt: new Date(0).toISOString(),
        },
        {
          id: "txn_002",
          subscriptionId: "sub_002",
          planName: "Growth",
          amountCents: 3599,
          currency: "USD",
          createdAt: new Date(100).toISOString(),
        },
      ],
      limit: 20,
      nextCursor: null,
    },
  };
}

function createSubscriptions(count: number): Subscription[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `sub_${String(index + 1).padStart(3, "0")}`,
    planName: `Plan ${index + 1}`,
    amountCents: 1000 + index * 100,
    currency: "USD",
    status: "active",
    billingIntervalMs: 2000 + index * 100,
    nextBillingAt: new Date(index * 1000 + 1000).toISOString(),
    pausedAt: null,
    pauseUntil: null,
    canceledAt: null,
    createdAt: new Date(index * 100).toISOString(),
    updatedAt: new Date(index * 100).toISOString(),
  }));
}

function createTransactions(count: number): TransactionFeedItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `txn_${String(index + 1).padStart(3, "0")}`,
    subscriptionId: index % 2 === 0 ? "sub_001" : "sub_002",
    planName: index % 2 === 0 ? "Starter" : "Growth",
    amountCents: index % 2 === 0 ? 1299 : 3599,
    currency: "USD",
    createdAt: new Date(index * 100).toISOString(),
  }));
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Dashboard", () => {
  it("highlights transactions for the selected subscription", async () => {
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Highlight Starter transactions" }),
    );

    const highlighted = screen.getByTestId("transaction-txn_001");
    const plain = screen.getByTestId("transaction-txn_002");

    expect(highlighted?.className).toContain("bg-amber-50");
    expect(plain?.className).toContain("bg-slate-50");
    expect(highlighted).toHaveTextContent("txn_001");
    expect(highlighted).not.toHaveTextContent("sub_001");
  });

  it("reconnects with the latest applied event id after going offline and online", async () => {
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    expect(FakeEventSource.instances[0].url).toBe("/api/stream?sinceEventId=2");

    act(() => {
      FakeEventSource.instances[0].emit(
        "transaction.created",
        {
          transaction: {
            id: "txn_003",
            subscriptionId: "sub_001",
            planName: "Starter",
            amountCents: 1299,
            currency: "USD",
            createdAt: new Date(200).toISOString(),
          },
        },
        "9",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /go offline/i }));
    await waitFor(() => {
      expect(FakeEventSource.instances[0].closed).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /go online/i }));

    await waitFor(() => {
      expect(FakeEventSource.instances).toHaveLength(2);
    });
    expect(FakeEventSource.instances[1].url).toBe("/api/stream?sinceEventId=9");
  });

  it("switches into reload-required when the stream does not recover", async () => {
    vi.useFakeTimers();
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    act(() => {
      FakeEventSource.instances[0].emitError();
      vi.advanceTimersByTime(3100);
    });

    expect(screen.getByText(/replay window expired/i)).toBeInTheDocument();
  });

  it("animates newly streamed transactions without leaving the card shell unstable", async () => {
    vi.useFakeTimers();
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    act(() => {
      FakeEventSource.instances[0].emit(
        "transaction.created",
        {
          transaction: {
            id: "txn_003",
            subscriptionId: "sub_001",
            planName: "Starter",
            amountCents: 1299,
            currency: "USD",
            createdAt: new Date(200).toISOString(),
          },
        },
        "10",
      );
    });

    const transaction = screen.getByTestId("transaction-txn_003");
    expect(transaction.className).toContain("transaction-card-surface-enter");
    expect(transaction.firstElementChild?.className).toContain(
      "transaction-card-content-enter",
    );

    act(() => {
      vi.advanceTimersByTime(721);
    });

    expect(screen.getByTestId("transaction-txn_003").className).not.toContain(
      "transaction-card-surface-enter",
    );
    expect(
      screen.getByTestId("transaction-txn_003").firstElementChild?.className,
    ).not.toContain("transaction-card-content-enter");
  });

  it("keeps the create form hidden until the user opens it", () => {
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    expect(screen.queryByLabelText("Plan")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add subscription/i }));

    expect(screen.getByLabelText("Plan")).toBeInTheDocument();
  });

  it("rejects non-integer create inputs on the client before submit", () => {
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    fireEvent.click(screen.getByRole("button", { name: /add subscription/i }));

    fireEvent.change(screen.getByLabelText("Plan"), {
      target: { value: "Decimal plan" },
    });
    fireEvent.change(screen.getByLabelText("Amount (USD cents)"), {
      target: { value: "12.5" },
    });

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Amount (USD cents)"), {
      target: { value: "1250" },
    });
    fireEvent.change(screen.getByLabelText("Interval (ms)"), {
      target: { value: "750.5" },
    });

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("opens pause options in a modal", () => {
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    fireEvent.click(screen.getAllByRole("button", { name: /pause/i })[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Custom seconds")).toBeInTheDocument();
  });

  it("rejects non-integer custom pause seconds on the client before submit", () => {
    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    fireEvent.click(screen.getAllByRole("button", { name: /pause/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /custom seconds/i }));
    fireEvent.change(screen.getByPlaceholderText("10"), {
      target: { value: "1.5" },
    });

    expect(screen.getByRole("button", { name: "Apply pause" })).toBeDisabled();
  });

  it("keeps subscriptions and transactions in separate scroll panels and virtualizes large lists", () => {
    const bootstrap = createBootstrap();
    const { container } = render(
      <Dashboard
        initialFilter="all"
        bootstrap={{
          ...bootstrap,
          subscriptions: {
            ...bootstrap.subscriptions,
            items: createSubscriptions(30),
          },
          transactions: {
            ...bootstrap.transactions,
            items: createTransactions(60),
          },
        }}
      />,
    );

    expect(screen.getByTestId("subscriptions-scroll-panel")).toBeInTheDocument();
    expect(screen.getByTestId("transactions-scroll-panel")).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-testid^="subscription-"]').length,
    ).toBeLessThan(30);
    expect(
      container.querySelectorAll('[data-testid^="transaction-"]').length,
    ).toBeLessThan(60);
  });

  it("syncs the selected filter into the url query string", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              subscriptions: {
                items: createBootstrap().subscriptions.items,
                limit: 5,
                nextCursor: null,
              },
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/");

    render(<Dashboard bootstrap={createBootstrap()} initialFilter="all" />);

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    await waitFor(() => {
      expect(window.location.search).toBe("?status=active");
    });

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
  });
});
