"use client";

import type { DashboardBootstrap } from "../../shared/subscriptions/types";
import { DashboardHeader } from "./components/dashboard-header";
import { DashboardNotices } from "./components/dashboard-notices";
import { PauseDialog } from "./components/pause-dialog";
import { SubscriptionsPanel } from "./components/subscriptions-panel";
import { TransactionsPanel } from "./components/transactions-panel";
import type { SubscriptionFilterValue } from "./types";
import { useDashboardController } from "./hooks/use-dashboard-controller";

export function Dashboard({
  bootstrap,
  initialFilter,
}: {
  bootstrap: DashboardBootstrap;
  initialFilter: SubscriptionFilterValue;
}) {
  const controller = useDashboardController(bootstrap, initialFilter);

  return (
    <>
      <main className="min-h-screen bg-[color:var(--background)] text-slate-950 xl:h-screen xl:overflow-hidden">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:h-full xl:min-h-0">
          <DashboardHeader
            offlineMode={controller.offlineMode}
            streamStatus={controller.state.streamStatus}
            onToggleOfflineMode={controller.toggleOfflineMode}
          />

          <DashboardNotices
            errorMessage={controller.errorMessage}
            isSubscriptionListStale={controller.state.isSubscriptionListStale}
            streamStatus={controller.state.streamStatus}
            onRefreshStaleList={() => void controller.handleRefreshStaleList()}
            onReloadPage={controller.reloadPage}
          />

          <div className="grid gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <SubscriptionsPanel
              amountCents={controller.createAmountCents}
              billingIntervalMs={controller.createBillingIntervalMs}
              canSubmitCreate={controller.canSubmitCreate}
              createPlanName={controller.createPlanName}
              filter={controller.state.filter}
              isCreateFormOpen={controller.isCreateFormOpen}
              isCreatePending={controller.isCreatePending}
              isSelected={(subscriptionId) =>
                controller.selectedSubscriptionId === subscriptionId
              }
              isSubscriptionPending={controller.isSubscriptionPending}
              loadingMore={controller.loadingMoreSubscriptions}
              nextCursor={controller.state.subscriptionNextCursor}
              subscriptions={controller.state.subscriptions}
              onAmountCentsChange={controller.setCreateAmountCents}
              onBillingIntervalMsChange={controller.setCreateBillingIntervalMs}
              onCancel={(subscriptionId) => {
                void controller.handleCancel(subscriptionId);
              }}
              onCreateSubmit={(event) => {
                void controller.handleCreate(event);
              }}
              onFilterChange={(filter) => {
                void controller.handleFilterChange(filter);
              }}
              onLoadMore={() => {
                void controller.handleLoadMoreSubscriptions();
              }}
              onPause={controller.openPauseDialog}
              onPlanNameChange={controller.setCreatePlanName}
              onResume={(subscriptionId) => {
                void controller.handleResume(subscriptionId);
              }}
              onToggleCreateForm={controller.toggleCreateForm}
              onToggleHighlight={controller.toggleHighlightedSubscription}
            />

            <TransactionsPanel
              enteringTransactionIds={controller.enteringTransactionIds}
              highlightedTransactions={controller.highlightedTransactions}
              items={controller.state.transactions}
              loadingMore={controller.loadingMoreTransactions}
              nextCursor={controller.state.transactionNextCursor}
              onLoadMore={() => {
                void controller.handleLoadMoreTransactions();
              }}
            />
          </div>
        </div>
      </main>

      <PauseDialog
        subscription={controller.pauseDialogSubscription}
        customSeconds={controller.pauseCustomSeconds}
        isPending={controller.isPausePending}
        pausePreset={controller.pausePreset}
        pauseSelection={controller.pauseSelection}
        onClose={controller.closePauseDialog}
        onConfirm={() => void controller.handlePauseConfirm()}
        onCustomSecondsChange={controller.setPauseCustomSeconds}
        onPausePresetChange={controller.setPausePreset}
      />
    </>
  );
}
