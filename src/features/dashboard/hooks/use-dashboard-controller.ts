"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardBootstrap } from "../../../shared/subscriptions/types";
import type { SubscriptionFilterValue } from "../types";
import { buildDashboardUrl } from "../url-state";
import { useDashboardData } from "./use-dashboard-data";
import { useSubscriptionActions } from "./use-subscription-actions";

export function useDashboardController(
  bootstrap: DashboardBootstrap,
  initialFilter: SubscriptionFilterValue,
) {
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(
    null,
  );
  const [offlineMode, setOfflineMode] = useState(false);
  const data = useDashboardData({
    bootstrap,
    initialFilter,
    offlineMode,
  });
  const actions = useSubscriptionActions({
    currentFilter: data.state.filter,
    refreshSubscriptions: data.refreshSubscriptions,
    setErrorMessage: data.setErrorMessage,
  });

  const highlightedTransactions = useMemo(() => {
    if (!selectedSubscriptionId) {
      return new Set<string>();
    }

    return new Set(
      data.state.transactions
        .filter((transaction) => transaction.subscriptionId === selectedSubscriptionId)
        .map((transaction) => transaction.id),
    );
  }, [data.state.transactions, selectedSubscriptionId]);

  const toggleOfflineMode = useCallback(() => {
    setOfflineMode((current) => !current);
  }, []);

  const toggleHighlightedSubscription = useCallback((subscriptionId: string) => {
    setSelectedSubscriptionId((current) => (current === subscriptionId ? null : subscriptionId));
  }, []);

  const reloadPage = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    const nextUrl = buildDashboardUrl(
      window.location.pathname,
      window.location.search,
      data.state.filter,
      window.location.hash,
    );
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [data.state.filter]);

  return {
    state: data.state,
    errorMessage: data.errorMessage,
    offlineMode,
    toggleOfflineMode,
    reloadPage,
    loadingMoreSubscriptions: data.loadingMoreSubscriptions,
    loadingMoreTransactions: data.loadingMoreTransactions,
    handleFilterChange: data.handleFilterChange,
    handleRefreshStaleList: data.handleRefreshStaleList,
    handleLoadMoreSubscriptions: data.handleLoadMoreSubscriptions,
    handleLoadMoreTransactions: data.handleLoadMoreTransactions,
    selectedSubscriptionId,
    toggleHighlightedSubscription,
    enteringTransactionIds: data.enteringTransactionIds,
    highlightedTransactions,
    ...actions,
  };
}
