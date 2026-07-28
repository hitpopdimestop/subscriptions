import { LoaderCircle } from "lucide-react";
import type { FormEvent } from "react";
import { PRIMARY_BUTTON_CLASS } from "../constants";

interface CreateSubscriptionFormProps {
  amountCents: string;
  billingIntervalMs: string;
  canSubmit: boolean;
  isPending: boolean;
  planName: string;
  onAmountCentsChange: (value: string) => void;
  onBillingIntervalMsChange: (value: string) => void;
  onPlanNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CreateSubscriptionForm({
  amountCents,
  billingIntervalMs,
  canSubmit,
  isPending,
  planName,
  onAmountCentsChange,
  onBillingIntervalMsChange,
  onPlanNameChange,
  onSubmit,
}: CreateSubscriptionFormProps) {
  return (
    <form
      className="grid gap-4 rounded-md border border-border bg-surface-muted p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(140px,0.65fr)_minmax(140px,0.7fr)_auto]"
      onSubmit={onSubmit}
    >
      <div className="lg:col-span-full">
        <p className="text-sm text-content-muted">
          New demo subscriptions are charged immediately and then join the fixed billing
          cadence.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-content-muted">
        <span>Plan</span>
        <input
          value={planName}
          onChange={(event) => onPlanNameChange(event.target.value)}
          className="h-10 rounded-md border border-border bg-surface px-3 outline-none transition focus:border-border-strong"
          placeholder="Growth"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-content-muted">
        <span>Amount (USD cents)</span>
        <input
          type="number"
          min={1}
          step={1}
          value={amountCents}
          onChange={(event) => onAmountCentsChange(event.target.value)}
          className="h-10 rounded-md border border-border bg-surface px-3 outline-none transition focus:border-border-strong"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-content-muted">
        <span>Interval (ms)</span>
        <input
          type="number"
          min={500}
          max={10000}
          step={100}
          value={billingIntervalMs}
          onChange={(event) => onBillingIntervalMsChange(event.target.value)}
          className="h-10 rounded-md border border-border bg-surface px-3 outline-none transition focus:border-border-strong"
        />
      </label>

      <div className="flex items-end">
        <button
          type="submit"
          className={`${PRIMARY_BUTTON_CLASS} h-10 w-full lg:w-auto`}
          disabled={!canSubmit || isPending}
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          <span>Create</span>
        </button>
      </div>
    </form>
  );
}
