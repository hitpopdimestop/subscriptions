import { AlertTriangle, RefreshCcw } from "lucide-react";
import { SECONDARY_BUTTON_CLASS } from "../constants";
import type { StreamStatus } from "../state";

interface DashboardNoticesProps {
  errorMessage: string | null;
  isSubscriptionListStale: boolean;
  streamStatus: StreamStatus;
  onRefreshStaleList: () => void;
  onReloadPage: () => void;
}

export function DashboardNotices({
  errorMessage,
  isSubscriptionListStale,
  streamStatus,
  onRefreshStaleList,
  onReloadPage,
}: DashboardNoticesProps) {
  return (
    <>
      {streamStatus === "reload-required" ? (
        <section
          data-testid="reload-required"
          className="flex items-center justify-between gap-4 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Replay window expired or the live stream could not recover.</span>
          </div>
          <button
            type="button"
            className="rounded-md bg-rose-900 px-3 py-2 text-sm font-medium text-white"
            onClick={onReloadPage}
          >
            Reload page
          </button>
        </section>
      ) : null}

      {isSubscriptionListStale ? (
        <section
          data-testid="stale-subscriptions-toast"
          className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Subscriptions list is outdated for the current filter.</span>
          </div>
          <button
            type="button"
            className={`${SECONDARY_BUTTON_CLASS} border-amber-400 text-amber-950 hover:bg-amber-100`}
            onClick={onRefreshStaleList}
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Refresh list</span>
          </button>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </section>
      ) : null}
    </>
  );
}
