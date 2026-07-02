import type { SubscriptionFilterStatus } from "../../shared/subscriptions/types";
import type { SubscriptionFilterValue } from "./types";

export const DASHBOARD_STATUS_SEARCH_PARAM = "status";

export function parseDashboardFilterValue(
  value: string | string[] | undefined,
): SubscriptionFilterValue {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "active" ? "active" : "all";
}

export function toSubscriptionFilterStatus(
  filter: SubscriptionFilterValue,
): SubscriptionFilterStatus | null {
  return filter === "active" ? "ACTIVE" : null;
}

export function buildDashboardUrl(
  pathname: string,
  search: string,
  filter: SubscriptionFilterValue,
  hash = "",
) {
  const searchParams = new URLSearchParams(search);

  if (filter === "active") {
    searchParams.set(DASHBOARD_STATUS_SEARCH_PARAM, "active");
  } else {
    searchParams.delete(DASHBOARD_STATUS_SEARCH_PARAM);
  }

  const nextSearch = searchParams.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash}`;
}
