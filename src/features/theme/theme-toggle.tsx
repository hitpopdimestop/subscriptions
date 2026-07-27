"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { SECONDARY_BUTTON_CLASS } from "../dashboard/constants";
import { nextPreference, type ThemePreference } from "./theme";
import { useTheme } from "./use-theme";

const LABELS: Record<ThemePreference, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

const ICONS: Record<ThemePreference, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      className={`${SECONDARY_BUTTON_CLASS} min-w-[9.5rem]`}
      onClick={() => setPreference(nextPreference(preference))}
      aria-label={`${LABELS[preference]}. Activate to change.`}
      data-testid="theme-toggle"
      data-preference={preference}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>{LABELS[preference]}</span>
    </button>
  );
}
