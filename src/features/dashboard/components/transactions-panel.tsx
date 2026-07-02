import { LoaderCircle } from "lucide-react";
import type { TransactionFeedItem } from "../../../shared/subscriptions/types";
import {
  SECTION_HEIGHT_CLASS,
  TRANSACTION_OVERSCAN,
  TRANSACTION_PANEL_TEST_ID,
  TRANSACTION_SLOT_CLASS_NAME,
  TRANSACTION_SLOT_HEIGHT_PX,
  TRANSACTION_VIRTUALIZATION_THRESHOLD,
  VIRTUALIZED_LIST_NEAR_END_THRESHOLD_PX,
} from "../constants";
import { TransactionCard } from "./transaction-card";
import { VirtualizedList } from "./virtualized-list";

interface TransactionsPanelProps {
  enteringTransactionIds: Set<string>;
  highlightedTransactions: Set<string>;
  items: TransactionFeedItem[];
  loadingMore: boolean;
  nextCursor: string | null;
  onLoadMore: () => void;
}

export function TransactionsPanel({
  enteringTransactionIds,
  highlightedTransactions,
  items,
  loadingMore,
  nextCursor,
  onLoadMore,
}: TransactionsPanelProps) {
  return (
    <section
      className={`flex ${SECTION_HEIGHT_CLASS} flex-col gap-4 rounded-md border border-slate-200 bg-white p-4`}
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Transactions</h2>
        <p className="text-sm text-slate-600">
          Initial feed comes from SSR. Older history loads on scroll.
        </p>
      </div>

      <VirtualizedList
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        contentClassName="pb-1"
        dataTestId={TRANSACTION_PANEL_TEST_ID}
        getKey={(transaction) => transaction.id}
        items={items}
        nearEndThresholdPx={VIRTUALIZED_LIST_NEAR_END_THRESHOLD_PX}
        onNearEnd={onLoadMore}
        overscan={TRANSACTION_OVERSCAN}
        renderItem={(transaction) => (
          <TransactionCard
            transaction={transaction}
            highlighted={highlightedTransactions.has(transaction.id)}
            entering={enteringTransactionIds.has(transaction.id)}
          />
        )}
        slotClassName={TRANSACTION_SLOT_CLASS_NAME}
        slotHeight={TRANSACTION_SLOT_HEIGHT_PX}
        threshold={TRANSACTION_VIRTUALIZATION_THRESHOLD}
      />

      <div className="flex h-8 items-center justify-center">
        {loadingMore ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
        ) : nextCursor ? (
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Scroll for older history
          </span>
        ) : (
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
            End of history
          </span>
        )}
      </div>
    </section>
  );
}
