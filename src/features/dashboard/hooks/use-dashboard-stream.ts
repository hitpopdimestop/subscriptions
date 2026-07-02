"use client";

import { useEffect, useRef } from "react";
import type {
  DomainEventPayloadMap,
  DomainEventType,
} from "../../../shared/subscriptions/types";
import type { StreamStatus } from "../state";

const DOMAIN_EVENT_TYPES: DomainEventType[] = [
  "subscription.created",
  "subscription.updated",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
  "transaction.created",
];

const RELOAD_REQUIRED_TIMEOUT_MS = 3_000;

export type ParsedDashboardStreamEvent = {
  [TType in DomainEventType]: {
    eventId: string;
    eventType: TType;
    payload: DomainEventPayloadMap[TType];
  };
}[DomainEventType];

interface UseDashboardStreamOptions {
  getSinceEventId: () => string;
  offlineMode: boolean;
  onEvent: (event: ParsedDashboardStreamEvent) => void;
  onStatusChange: (status: StreamStatus) => void;
}

export function useDashboardStream({
  getSinceEventId,
  offlineMode,
  onEvent,
  onStatusChange,
}: UseDashboardStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const getSinceEventIdRef = useRef(getSinceEventId);
  const onEventRef = useRef(onEvent);
  const onStatusChangeRef = useRef(onStatusChange);
  const offlineModeRef = useRef(offlineMode);

  useEffect(() => {
    getSinceEventIdRef.current = getSinceEventId;
    onEventRef.current = onEvent;
    onStatusChangeRef.current = onStatusChange;
    offlineModeRef.current = offlineMode;
  }, [getSinceEventId, offlineMode, onEvent, onStatusChange]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    if (offlineMode) {
      onStatusChangeRef.current("offline");
      return;
    }

    const sinceEventId = getSinceEventIdRef.current();
    const params = sinceEventId ? `?sinceEventId=${encodeURIComponent(sinceEventId)}` : "";
    const source = new EventSource(`/api/stream${params}`);
    eventSourceRef.current = source;
    onStatusChangeRef.current("connecting");

    source.onopen = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      onStatusChangeRef.current("live");
    };

    source.onerror = () => {
      if (offlineModeRef.current) {
        return;
      }

      onStatusChangeRef.current("connecting");

      if (reconnectTimerRef.current === null) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          source.close();

          if (eventSourceRef.current === source) {
            eventSourceRef.current = null;
          }

          onStatusChangeRef.current("reload-required");
        }, RELOAD_REQUIRED_TIMEOUT_MS);
      }
    };

    for (const eventType of DOMAIN_EVENT_TYPES) {
      source.addEventListener(eventType, (event) => {
        const messageEvent = event as MessageEvent<string>;
        const payload = JSON.parse(messageEvent.data) as DomainEventPayloadMap[typeof eventType];

        onEventRef.current({
          eventId: messageEvent.lastEventId,
          eventType,
          payload,
        } as ParsedDashboardStreamEvent);
      });
    }

    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      source.close();

      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    };
  }, [offlineMode]);
}
