// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStream } from "./use-dashboard-stream";

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

  emitOpen() {
    this.onopen?.(new Event("open"));
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }
}

function StreamHarness(props: {
  getSinceEventId: () => string;
  offlineMode: boolean;
  onEvent: Parameters<typeof useDashboardStream>[0]["onEvent"];
  onStatusChange: Parameters<typeof useDashboardStream>[0]["onStatusChange"];
}) {
  useDashboardStream(props);
  return null;
}

describe("useDashboardStream", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens with the latest event id and forwards parsed events", () => {
    const events: Array<{ eventType: string; eventId: string }> = [];
    const statuses: string[] = [];

    render(
      <StreamHarness
        getSinceEventId={() => "2"}
        offlineMode={false}
        onEvent={(event) => {
          events.push({ eventType: event.eventType, eventId: event.eventId });
        }}
        onStatusChange={(status) => {
          statuses.push(status);
        }}
      />,
    );

    expect(FakeEventSource.instances[0].url).toBe("/api/stream?sinceEventId=2");
    expect(statuses.at(-1)).toBe("connecting");

    act(() => {
      FakeEventSource.instances[0].emitOpen();
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

    expect(statuses.at(-1)).toBe("live");
    expect(events).toEqual([{ eventType: "transaction.created", eventId: "9" }]);
  });

  it("closes and reopens with the newest event id after offline mode changes", () => {
    let currentEventId = "2";

    const { rerender } = render(
      <StreamHarness
        getSinceEventId={() => currentEventId}
        offlineMode={false}
        onEvent={(event) => {
          currentEventId = event.eventId;
        }}
        onStatusChange={() => {}}
      />,
    );

    act(() => {
      FakeEventSource.instances[0].emit(
        "subscription.updated",
        {
          subscription: {
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
            updatedAt: new Date(200).toISOString(),
          },
        },
        "9",
      );
    });

    rerender(
      <StreamHarness
        getSinceEventId={() => currentEventId}
        offlineMode={true}
        onEvent={(event) => {
          currentEventId = event.eventId;
        }}
        onStatusChange={() => {}}
      />,
    );

    expect(FakeEventSource.instances[0].closed).toBe(true);

    rerender(
      <StreamHarness
        getSinceEventId={() => currentEventId}
        offlineMode={false}
        onEvent={(event) => {
          currentEventId = event.eventId;
        }}
        onStatusChange={() => {}}
      />,
    );

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances[1].url).toBe("/api/stream?sinceEventId=9");
  });

  it("switches to reload-required when the stream does not recover in time", () => {
    vi.useFakeTimers();

    const statuses: string[] = [];

    render(
      <StreamHarness
        getSinceEventId={() => "2"}
        offlineMode={false}
        onEvent={() => {}}
        onStatusChange={(status) => {
          statuses.push(status);
        }}
      />,
    );

    act(() => {
      FakeEventSource.instances[0].emitError();
      vi.advanceTimersByTime(3_100);
    });

    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(statuses.at(-1)).toBe("reload-required");
  });
});
