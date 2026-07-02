"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";
import type { Subscription } from "../../../shared/subscriptions/types";
import {
  ICON_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "../constants";
import type { PausePreset } from "../types";

interface PauseDialogProps {
  customSeconds: string;
  isPending: boolean;
  pausePreset: PausePreset;
  pauseSelection: number | null | undefined;
  subscription: Subscription | null;
  onClose: () => void;
  onConfirm: () => void;
  onCustomSecondsChange: (value: string) => void;
  onPausePresetChange: (value: PausePreset) => void;
}

export function PauseDialog({
  customSeconds,
  isPending,
  pausePreset,
  pauseSelection,
  subscription,
  onClose,
  onConfirm,
  onCustomSecondsChange,
  onPausePresetChange,
}: PauseDialogProps) {
  useEffect(() => {
    if (!subscription) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onClose, subscription]);

  if (!subscription) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-dialog-title"
        className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Pause subscription</p>
            <h3 id="pause-dialog-title" className="text-xl font-semibold text-slate-950">
              {subscription.planName}
            </h3>
          </div>

          <button
            type="button"
            className={ICON_BUTTON_CLASS}
            title="Close pause options."
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          Pausing shifts the billing schedule forward by the time this subscription stays
          paused.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {([
            ["1", "1 second", "Resume quickly after a short pause."],
            ["2", "2 seconds", "Keep the schedule pushed by two seconds."],
            ["5", "5 seconds", "A longer visible pause for the demo flow."],
            ["indefinite", "Indefinite", "Stay paused until you manually resume it."],
          ] as const).map(([value, label, description]) => {
            const selected = pausePreset === value;

            return (
              <button
                key={value}
                type="button"
                className={`rounded-md border px-4 py-3 text-left transition ${
                  selected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-300 bg-white text-slate-950 hover:border-slate-400 hover:bg-slate-50"
                }`}
                onClick={() => onPausePresetChange(value)}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span
                  className={`mt-1 block text-xs ${
                    selected ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  {description}
                </span>
              </button>
            );
          })}

          <div
            className={`rounded-md border px-4 py-3 transition sm:col-span-2 ${
              pausePreset === "custom"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-300 bg-white text-slate-950"
            }`}
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => onPausePresetChange("custom")}
            >
              <span className="block text-sm font-semibold">Custom seconds</span>
              <span
                className={`mt-1 block text-xs ${
                  pausePreset === "custom" ? "text-slate-200" : "text-slate-500"
                }`}
              >
                Choose any positive number of seconds.
              </span>
            </button>

            <input
              type="number"
              min={1}
              step={1}
              value={customSeconds}
              onFocus={() => onPausePresetChange("custom")}
              onChange={(event) => onCustomSecondsChange(event.target.value)}
              className={`mt-3 h-10 w-full rounded-md border px-3 outline-none transition ${
                pausePreset === "custom"
                  ? "border-slate-200 bg-white text-slate-950 focus:border-slate-300"
                  : "border-slate-300 bg-white text-slate-950 focus:border-slate-950"
              }`}
              placeholder="10"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={isPending || (pausePreset !== "indefinite" && pauseSelection === undefined)}
            onClick={onConfirm}
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            <span>Apply pause</span>
          </button>
        </div>
      </div>
    </div>
  );
}
