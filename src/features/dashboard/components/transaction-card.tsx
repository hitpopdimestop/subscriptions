import type { CSSProperties } from "react";
import type { TransactionFeedItem } from "../../../shared/subscriptions/types";
import { TRANSACTION_CARD_HEIGHT_CLASS } from "../constants";
import { formatAmount, formatTimestamp } from "../formatters";

interface TransactionCardProps {
  entering: boolean;
  highlighted: boolean;
  transaction: TransactionFeedItem;
}

export function TransactionCard({
  entering,
  highlighted,
  transaction,
}: TransactionCardProps) {
  const surfaceStyle = {
    "--transaction-card-bg": highlighted
      ? "var(--color-warn-surface)"
      : "var(--color-surface-muted)",
    "--transaction-card-border": highlighted
      ? "var(--color-warn-border)"
      : "var(--color-border)",
  } as CSSProperties;

  return (
    <article
      data-testid={`transaction-${transaction.id}`}
      style={surfaceStyle}
      className={`${TRANSACTION_CARD_HEIGHT_CLASS} rounded-md border px-3 py-3 transition ${
        highlighted ? "border-warn-border bg-warn-surface" : "border-border bg-surface-muted"
      } ${entering ? "transaction-card-surface-enter" : ""}`}
    >
      <div
        className={`flex items-start justify-between gap-3 ${
          entering ? "transaction-card-content-enter" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-content">{transaction.planName}</p>
          <p className="truncate font-mono text-xs text-content-muted">{transaction.id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-content">
            {formatAmount(transaction.amountCents, transaction.currency)}
          </p>
          <p className="text-xs text-content-muted">{formatTimestamp(transaction.createdAt)}</p>
        </div>
      </div>
    </article>
  );
}
