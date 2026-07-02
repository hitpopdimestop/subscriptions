"use client";

import { useCallback, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  isBillingIntervalInRange,
  isPositiveInteger,
  resolveValidPauseSeconds,
} from "../../../shared/subscriptions/input-rules";
import type { DashboardBootstrap } from "../../../shared/subscriptions/types";
import {
  cancelSubscription,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
} from "../client";
import type {
  PendingAction,
  PausePreset,
  SubscriptionFilterValue,
} from "../types";

type DashboardSubscriptionItem = DashboardBootstrap["subscriptions"]["items"][number];

function resolvePauseSeconds(
  preset: PausePreset,
  customPauseSeconds: string,
): number | null | undefined {
  if (preset === "indefinite") {
    return null;
  }

  if (preset === "custom") {
    return resolveValidPauseSeconds(Number(customPauseSeconds));
  }

  return resolveValidPauseSeconds(Number(preset));
}

interface UseSubscriptionActionsOptions {
  currentFilter: SubscriptionFilterValue;
  refreshSubscriptions: (filter: SubscriptionFilterValue) => Promise<void>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}

export function useSubscriptionActions({
  currentFilter,
  refreshSubscriptions,
  setErrorMessage,
}: UseSubscriptionActionsOptions) {
  const [pendingActions, setPendingActions] = useState<Set<PendingAction>>(new Set());
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createPlanName, setCreatePlanName] = useState("");
  const [createAmountCents, setCreateAmountCents] = useState("1299");
  const [createBillingIntervalMs, setCreateBillingIntervalMs] = useState("2000");
  const [pauseDialogSubscription, setPauseDialogSubscription] =
    useState<DashboardSubscriptionItem | null>(null);
  const [pausePreset, setPausePreset] = useState<PausePreset>("1");
  const [pauseCustomSeconds, setPauseCustomSeconds] = useState("");

  const setPending = useCallback((key: PendingAction, pending: boolean) => {
    setPendingActions((current) => {
      const next = new Set(current);

      if (pending) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }, []);

  const mutateSubscription = useCallback(
    async (key: PendingAction, action: () => Promise<void>) => {
      setPending(key, true);

      try {
        setErrorMessage(null);
        await action();
        return true;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Mutation failed.");
        return false;
      } finally {
        setPending(key, false);
      }
    },
    [setErrorMessage, setPending],
  );

  const handlePause = useCallback(
    async (subscriptionId: string, pauseSeconds?: number | null) => {
      return mutateSubscription(`pause:${subscriptionId}`, async () => {
        await pauseSubscription(subscriptionId, pauseSeconds);
      });
    },
    [mutateSubscription],
  );

  const handleResume = useCallback(
    async (subscriptionId: string) => {
      return mutateSubscription(`resume:${subscriptionId}`, async () => {
        await resumeSubscription(subscriptionId);
      });
    },
    [mutateSubscription],
  );

  const handleCancel = useCallback(
    async (subscriptionId: string) => {
      return mutateSubscription(`cancel:${subscriptionId}`, async () => {
        await cancelSubscription(subscriptionId);
      });
    },
    [mutateSubscription],
  );

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const created = await mutateSubscription("create:form", async () => {
        await createSubscription({
          planName: createPlanName.trim(),
          amountCents: Number(createAmountCents),
          currency: "USD",
          billingIntervalMs: Number(createBillingIntervalMs),
        });
        await refreshSubscriptions(currentFilter);
      });

      if (!created) {
        return;
      }

      setCreatePlanName("");
      setCreateAmountCents("1299");
      setCreateBillingIntervalMs("2000");
      setIsCreateFormOpen(false);
    },
    [
      createAmountCents,
      createBillingIntervalMs,
      createPlanName,
      currentFilter,
      mutateSubscription,
      refreshSubscriptions,
    ],
  );

  const openPauseDialog = useCallback((subscription: DashboardSubscriptionItem) => {
    setPauseDialogSubscription(subscription);
    setPausePreset("1");
    setPauseCustomSeconds("");
  }, []);

  const closePauseDialog = useCallback(() => {
    setPauseDialogSubscription(null);
    setPausePreset("1");
    setPauseCustomSeconds("");
  }, []);

  const handlePauseConfirm = useCallback(async () => {
    if (!pauseDialogSubscription) {
      return;
    }

    const pauseSeconds = resolvePauseSeconds(pausePreset, pauseCustomSeconds);

    if (pausePreset !== "indefinite" && pauseSeconds === undefined) {
      return;
    }

    const paused = await handlePause(
      pauseDialogSubscription.id,
      pauseSeconds === undefined ? undefined : pauseSeconds,
    );

    if (paused) {
      closePauseDialog();
    }
  }, [
    closePauseDialog,
    handlePause,
    pauseCustomSeconds,
    pauseDialogSubscription,
    pausePreset,
  ]);

  const canSubmitCreate =
    createPlanName.trim().length > 0 &&
    isPositiveInteger(Number(createAmountCents)) &&
    isBillingIntervalInRange(Number(createBillingIntervalMs));
  const pauseSelection = resolvePauseSeconds(pausePreset, pauseCustomSeconds);
  const isPausePending = pauseDialogSubscription
    ? pendingActions.has(`pause:${pauseDialogSubscription.id}`)
    : false;

  const toggleCreateForm = useCallback(() => {
    setIsCreateFormOpen((current) => !current);
  }, []);

  const isSubscriptionPending = useCallback(
    (subscriptionId: string) =>
      pendingActions.has(`pause:${subscriptionId}`) ||
      pendingActions.has(`resume:${subscriptionId}`) ||
      pendingActions.has(`cancel:${subscriptionId}`),
    [pendingActions],
  );

  return {
    isCreateFormOpen,
    toggleCreateForm,
    createPlanName,
    setCreatePlanName,
    createAmountCents,
    setCreateAmountCents,
    createBillingIntervalMs,
    setCreateBillingIntervalMs,
    canSubmitCreate,
    isCreatePending: pendingActions.has("create:form"),
    handleCreate,
    isSubscriptionPending,
    openPauseDialog,
    handleResume,
    handleCancel,
    pauseDialogSubscription,
    closePauseDialog,
    pausePreset,
    setPausePreset,
    pauseCustomSeconds,
    setPauseCustomSeconds,
    pauseSelection,
    isPausePending,
    handlePauseConfirm,
  };
}
