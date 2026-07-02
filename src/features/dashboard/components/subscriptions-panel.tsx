import { LoaderCircle, Plus, X } from "lucide-react";
import type { FormEvent } from "react";
import type { Subscription } from "../../../shared/subscriptions/types";
import {
  SECONDARY_BUTTON_CLASS,
  SECTION_HEIGHT_CLASS,
  SUBSCRIPTION_OVERSCAN,
  SUBSCRIPTION_PANEL_TEST_ID,
  SUBSCRIPTION_SLOT_CLASS_NAME,
  SUBSCRIPTION_SLOT_HEIGHT_PX,
  SUBSCRIPTION_VIRTUALIZATION_THRESHOLD,
} from "../constants";
import type { SubscriptionFilterValue } from "../types";
import { CreateSubscriptionForm } from "./create-subscription-form";
import { SubscriptionCard } from "./subscription-card";
import { VirtualizedList } from "./virtualized-list";

interface SubscriptionsPanelProps {
  billingIntervalMs: string;
  amountCents: string;
  canSubmitCreate: boolean;
  createPlanName: string;
  filter: SubscriptionFilterValue;
  isCreateFormOpen: boolean;
  isCreatePending: boolean;
  isSelected: (subscriptionId: string) => boolean;
  isSubscriptionPending: (subscriptionId: string) => boolean;
  loadingMore: boolean;
  nextCursor: string | null;
  subscriptions: Subscription[];
  onAmountCentsChange: (value: string) => void;
  onBillingIntervalMsChange: (value: string) => void;
  onCancel: (subscriptionId: string) => void;
  onCreateSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFilterChange: (filter: SubscriptionFilterValue) => void;
  onLoadMore: () => void;
  onPause: (subscription: Subscription) => void;
  onPlanNameChange: (value: string) => void;
  onResume: (subscriptionId: string) => void;
  onToggleCreateForm: () => void;
  onToggleHighlight: (subscriptionId: string) => void;
}

export function SubscriptionsPanel({
  amountCents,
  billingIntervalMs,
  canSubmitCreate,
  createPlanName,
  filter,
  isCreateFormOpen,
  isCreatePending,
  isSelected,
  isSubscriptionPending,
  loadingMore,
  nextCursor,
  subscriptions,
  onAmountCentsChange,
  onBillingIntervalMsChange,
  onCancel,
  onCreateSubmit,
  onFilterChange,
  onLoadMore,
  onPause,
  onPlanNameChange,
  onResume,
  onToggleCreateForm,
  onToggleHighlight,
}: SubscriptionsPanelProps) {
  return (
    <section
      className={`flex ${SECTION_HEIGHT_CLASS} flex-col gap-4 rounded-md border border-slate-200 bg-white p-4`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Subscriptions</h2>
          <p className="text-sm text-slate-600">
            Server-side filtering with live SSE updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-expanded={isCreateFormOpen}
            className={SECONDARY_BUTTON_CLASS}
            title="Open the new subscription form."
            onClick={onToggleCreateForm}
          >
            {isCreateFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isCreateFormOpen ? "Hide form" : "Add subscription"}</span>
          </button>

          <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
            {([
              ["all", "All"],
              ["active", "Active"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  filter === value
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => onFilterChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isCreateFormOpen ? (
        <CreateSubscriptionForm
          planName={createPlanName}
          amountCents={amountCents}
          billingIntervalMs={billingIntervalMs}
          canSubmit={canSubmitCreate}
          isPending={isCreatePending}
          onPlanNameChange={onPlanNameChange}
          onAmountCentsChange={onAmountCentsChange}
          onBillingIntervalMsChange={onBillingIntervalMsChange}
          onSubmit={onCreateSubmit}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <VirtualizedList
          className="min-h-0 flex-1 overflow-y-auto pr-1"
          contentClassName="pb-1"
          dataTestId={SUBSCRIPTION_PANEL_TEST_ID}
          getKey={(subscription) => subscription.id}
          items={subscriptions}
          overscan={SUBSCRIPTION_OVERSCAN}
          renderItem={(subscription) => (
            <SubscriptionCard
              subscription={subscription}
              pending={isSubscriptionPending(subscription.id)}
              isSelected={isSelected(subscription.id)}
              onToggleHighlight={() => onToggleHighlight(subscription.id)}
              onPause={() => onPause(subscription)}
              onResume={() => onResume(subscription.id)}
              onCancel={() => onCancel(subscription.id)}
            />
          )}
          slotClassName={SUBSCRIPTION_SLOT_CLASS_NAME}
          slotHeight={SUBSCRIPTION_SLOT_HEIGHT_PX}
          threshold={SUBSCRIPTION_VIRTUALIZATION_THRESHOLD}
        />

        {nextCursor ? (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              <span>Load more</span>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
