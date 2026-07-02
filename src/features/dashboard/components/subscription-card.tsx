import { Ban, Pause, Play, Search } from "lucide-react";
import type { Subscription } from "../../../shared/subscriptions/types";
import {
  DANGER_ICON_BUTTON_CLASS,
  ICON_BUTTON_CLASS,
  SUBSCRIPTION_CARD_HEIGHT_CLASS,
} from "../constants";
import { formatAmount, formatTimestamp, statusTone } from "../formatters";
import { PauseCountdownText } from "./pause-countdown-text";

interface SubscriptionCardProps {
  isSelected: boolean;
  pending: boolean;
  subscription: Subscription;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleHighlight: () => void;
}

export function SubscriptionCard({
  isSelected,
  pending,
  subscription,
  onCancel,
  onPause,
  onResume,
  onToggleHighlight,
}: SubscriptionCardProps) {
  const timingLabel =
    subscription.status === "active"
      ? "Next billing"
      : subscription.status === "paused"
        ? subscription.pauseUntil
          ? "Pause ends"
          : "Paused"
        : "Canceled";
  const timingValue =
    subscription.status === "active" ? (
      formatTimestamp(subscription.nextBillingAt)
    ) : subscription.status === "paused" ? (
      subscription.pauseUntil ? (
        <PauseCountdownText pauseUntil={subscription.pauseUntil} />
      ) : (
        "Manual resume"
      )
    ) : (
      formatTimestamp(subscription.canceledAt ?? subscription.updatedAt)
    );

  return (
    <article
      data-testid={`subscription-${subscription.id}`}
      className={`${SUBSCRIPTION_CARD_HEIGHT_CLASS} rounded-md border border-slate-200 bg-white px-4 py-2.5`}
    >
      <div className="flex h-full items-stretch justify-between gap-4">
        <div className="flex h-full min-w-0 flex-col">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-950">
                {subscription.planName}
              </h3>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(
                  subscription.status,
                )}`}
              >
                {subscription.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="truncate font-mono">{subscription.id}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{subscription.billingIntervalMs} ms cadence</span>
            </div>
          </div>

          <div className="mt-auto space-y-0.5 pb-1">
            <p className="truncate text-sm text-slate-950">
              <span className="mr-2 text-slate-500">{timingLabel}</span>
              <span className="font-medium">{timingValue}</span>
            </p>
            <p className="truncate text-xs text-slate-500">
              Updated {formatTimestamp(subscription.updatedAt)}
            </p>
          </div>
        </div>

        <div className="flex h-full shrink-0 flex-col items-end self-stretch">
          <p className="text-lg font-semibold text-slate-950">
            {formatAmount(subscription.amountCents, subscription.currency)}
          </p>
          <div className="mt-auto mb-1 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              data-testid={`highlight-${subscription.id}`}
              aria-label={`Highlight ${subscription.planName} transactions`}
              className={`${ICON_BUTTON_CLASS} ${
                isSelected ? "border-slate-950 bg-slate-950 text-white" : ""
              }`}
              title="Highlight this subscription in the transaction feed."
              onClick={onToggleHighlight}
            >
              <Search className="h-4 w-4" />
            </button>

            {subscription.status === "active" ? (
              <button
                type="button"
                aria-label={`Pause ${subscription.planName}`}
                className={ICON_BUTTON_CLASS}
                title="Choose how long to pause billing."
                disabled={pending}
                onClick={onPause}
              >
                <Pause className="h-4 w-4" />
              </button>
            ) : null}

            {subscription.status === "paused" ? (
              <button
                type="button"
                aria-label={`Resume ${subscription.planName}`}
                className={`${ICON_BUTTON_CLASS} border-slate-950 bg-slate-950 text-white hover:bg-slate-800`}
                title="Resume billing for this subscription."
                disabled={pending}
                onClick={onResume}
              >
                <Play className="h-4 w-4" />
              </button>
            ) : null}

            {subscription.status !== "canceled" ? (
              <button
                type="button"
                aria-label={`Cancel ${subscription.planName}`}
                className={DANGER_ICON_BUTTON_CLASS}
                title="Cancel this subscription immediately."
                disabled={pending}
                onClick={onCancel}
              >
                <Ban className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
