"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { DashboardBootstrap } from "../../../shared/subscriptions/types";
import { fetchSubscriptionSlice, fetchTransactionSlice } from "../client";
import { TRANSACTION_ENTRY_ANIMATION_MS } from "../constants";
import {
  createDashboardInitialState,
  dashboardReducer,
  type StreamStatus,
} from "../state";
import type { SubscriptionFilterValue } from "../types";
import type { ParsedDashboardStreamEvent } from "./use-dashboard-stream";
import { useDashboardStream } from "./use-dashboard-stream";

function useEnteringTransactionIds() {
  const [enteringTransactionIds, setEnteringTransactionIds] = useState<Set<string>>(
    new Set(),
  );
  const transactionEntryTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const transactionEntryTimers = transactionEntryTimersRef.current;

    return () => {
      for (const timerId of transactionEntryTimers.values()) {
        window.clearTimeout(timerId);
      }

      transactionEntryTimers.clear();
    };
  }, []);

  const markTransactionEntering = useCallback((transactionId: string) => {
    setEnteringTransactionIds((current) => {
      const next = new Set(current);
      next.add(transactionId);
      return next;
    });

    const existingTimerId = transactionEntryTimersRef.current.get(transactionId);

    if (existingTimerId !== undefined) {
      window.clearTimeout(existingTimerId);
    }

    const timerId = window.setTimeout(() => {
      transactionEntryTimersRef.current.delete(transactionId);
      setEnteringTransactionIds((current) => {
        if (!current.has(transactionId)) {
          return current;
        }

        const next = new Set(current);
        next.delete(transactionId);
        return next;
      });
    }, TRANSACTION_ENTRY_ANIMATION_MS);

    transactionEntryTimersRef.current.set(transactionId, timerId);
  }, []);

  return {
    enteringTransactionIds,
    markTransactionEntering,
  };
}

interface UseDashboardDataOptions {
  bootstrap: DashboardBootstrap;
  initialFilter: SubscriptionFilterValue;
  offlineMode: boolean;
}

export function useDashboardData({
  bootstrap,
  initialFilter,
  offlineMode,
}: UseDashboardDataOptions) {
  const [state, dispatch] = useReducer(
    dashboardReducer,
    { bootstrap, initialFilter },
    createDashboardInitialState,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMoreSubscriptions, setLoadingMoreSubscriptions] = useState(false);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);
  const { enteringTransactionIds, markTransactionEntering } = useEnteringTransactionIds();
  const stateRef = useRef(state);
  const loadingSubscriptionCursorRef = useRef<string | null>(null);
  const loadingTransactionCursorRef = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyDomainEvent = useCallback(
    (event: ParsedDashboardStreamEvent) => {
      if (event.eventType === "transaction.created") {
        const isNewLocally = !stateRef.current.transactions.some(
          (transaction) => transaction.id === event.payload.transaction.id,
        );

        dispatch({
          type: "event/applied",
          eventId: event.eventId,
          eventType: "transaction.created",
          payload: event.payload,
        });

        if (isNewLocally) {
          markTransactionEntering(event.payload.transaction.id);
        }

        return;
      }

      dispatch({
        type: "event/applied",
        eventId: event.eventId,
        eventType: event.eventType,
        payload: event.payload,
      });
    },
    [markTransactionEntering],
  );

  useDashboardStream({
    getSinceEventId: () => stateRef.current.lastAppliedEventId,
    offlineMode,
    onEvent: applyDomainEvent,
    onStatusChange: (status: StreamStatus) => {
      dispatch({
        type: "stream/status",
        status,
      });
    },
  });

  const refreshSubscriptions = useCallback(async (filter: SubscriptionFilterValue) => {
    const subscriptions = await fetchSubscriptionSlice(filter);
    dispatch({
      type: "subscriptions/replaced",
      filter,
      items: subscriptions.items,
      nextCursor: subscriptions.nextCursor,
    });
  }, []);

  const handleFilterChange = useCallback(
    async (filter: SubscriptionFilterValue) => {
      try {
        setErrorMessage(null);
        await refreshSubscriptions(filter);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to refresh subscriptions.",
        );
      }
    },
    [refreshSubscriptions],
  );

  const handleRefreshStaleList = useCallback(async () => {
    try {
      setErrorMessage(null);
      await refreshSubscriptions(state.filter);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to refresh subscriptions.",
      );
    }
  }, [refreshSubscriptions, state.filter]);

  const handleLoadMoreSubscriptions = useCallback(async () => {
    const cursor = state.subscriptionNextCursor;

    if (
      !cursor ||
      loadingMoreSubscriptions ||
      loadingSubscriptionCursorRef.current === cursor
    ) {
      return;
    }

    loadingSubscriptionCursorRef.current = cursor;
    setLoadingMoreSubscriptions(true);

    try {
      const subscriptions = await fetchSubscriptionSlice(state.filter, cursor);
      dispatch({
        type: "subscriptions/appended",
        items: subscriptions.items,
        nextCursor: subscriptions.nextCursor,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load more subscriptions.",
      );
    } finally {
      if (loadingSubscriptionCursorRef.current === cursor) {
        loadingSubscriptionCursorRef.current = null;
      }
      setLoadingMoreSubscriptions(false);
    }
  }, [loadingMoreSubscriptions, state.filter, state.subscriptionNextCursor]);

  const handleLoadMoreTransactions = useCallback(async () => {
    const cursor = state.transactionNextCursor;

    if (
      !cursor ||
      loadingMoreTransactions ||
      loadingTransactionCursorRef.current === cursor
    ) {
      return;
    }

    loadingTransactionCursorRef.current = cursor;
    setLoadingMoreTransactions(true);

    try {
      const transactions = await fetchTransactionSlice(cursor);
      dispatch({
        type: "transactions/appended",
        items: transactions.items,
        nextCursor: transactions.nextCursor,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load more transactions.",
      );
    } finally {
      if (loadingTransactionCursorRef.current === cursor) {
        loadingTransactionCursorRef.current = null;
      }
      setLoadingMoreTransactions(false);
    }
  }, [loadingMoreTransactions, state.transactionNextCursor]);

  return {
    state,
    errorMessage,
    setErrorMessage,
    refreshSubscriptions,
    handleFilterChange,
    handleRefreshStaleList,
    handleLoadMoreSubscriptions,
    handleLoadMoreTransactions,
    loadingMoreSubscriptions,
    loadingMoreTransactions,
    enteringTransactionIds,
  };
}
