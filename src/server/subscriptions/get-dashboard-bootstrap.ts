import {
  DASHBOARD_BOOTSTRAP_QUERY,
  getDefaultDashboardBootstrapVariables,
  type DashboardBootstrapResult,
} from "../../shared/subscriptions/graphql-documents";
import type {
  DashboardBootstrap,
  SubscriptionFilterStatus,
} from "../../shared/subscriptions/types";
import { executeSubscriptionsGraphQL } from "./graphql";

function toPlainDashboardBootstrap(
  bootstrap: DashboardBootstrapResult["dashboardBootstrap"],
): DashboardBootstrap {
  return {
    snapshotEventId: bootstrap.snapshotEventId,
    subscriptions: {
      items: bootstrap.subscriptions.items.map((subscription) => ({ ...subscription })),
      limit: bootstrap.subscriptions.limit,
      nextCursor: bootstrap.subscriptions.nextCursor,
    },
    transactions: {
      items: bootstrap.transactions.items.map((transaction) => ({ ...transaction })),
      limit: bootstrap.transactions.limit,
      nextCursor: bootstrap.transactions.nextCursor,
    },
  };
}

export async function getDashboardBootstrap(
  status: SubscriptionFilterStatus | null = null,
) {
  const result = await executeSubscriptionsGraphQL<DashboardBootstrapResult>(
    DASHBOARD_BOOTSTRAP_QUERY,
    getDefaultDashboardBootstrapVariables(status),
  );

  if (!result.data?.dashboardBootstrap || result.errors?.length) {
    throw new Error(
      result.errors?.map((error) => error.message).join(", ") ??
        "Failed to bootstrap dashboard.",
    );
  }

  return toPlainDashboardBootstrap(result.data.dashboardBootstrap);
}
