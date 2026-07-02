import { Dashboard } from "../features/dashboard/dashboard";
import {
  parseDashboardFilterValue,
  toSubscriptionFilterStatus,
} from "../features/dashboard/url-state";
import { getDashboardBootstrap } from "../server/subscriptions/get-dashboard-bootstrap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const initialFilter = parseDashboardFilterValue((await searchParams).status);
  const bootstrap = await getDashboardBootstrap(
    toSubscriptionFilterStatus(initialFilter),
  );
  return <Dashboard bootstrap={bootstrap} initialFilter={initialFilter} />;
}
