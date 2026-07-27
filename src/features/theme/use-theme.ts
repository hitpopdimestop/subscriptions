"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseStoredPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    return parseStoredPreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function applyPreference(preference: ThemePreference) {
  const systemPrefersDark = window.matchMedia(DARK_QUERY).matches;
  document.documentElement.setAttribute(
    "data-theme",
    resolveTheme(preference, systemPrefersDark),
  );
}

export function useTheme() {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readPreference);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyPreference(next);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode); the in-memory preference still applies.
    }
  }, []);

  // Re-assert the resolved theme after hydration: React reconciles the
  // server-rendered `data-theme` onto <html>, discarding what the blocking
  // inline script wrote. `suppressHydrationWarning` silences the warning but
  // does not prevent that attribute patch, so the DOM must be corrected here.
  // Then track the OS setting for as long as the preference is `system`.
  useEffect(() => {
    applyPreference(preference);

    if (preference !== "system") {
      return;
    }

    const query = window.matchMedia(DARK_QUERY);
    const handleChange = () => applyPreference("system");

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [preference]);

  // Cross-tab sync. The `storage` event fires only in other tabs.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const next = parseStoredPreference(event.newValue);
      setPreferenceState(next);
      applyPreference(next);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { preference, setPreference };
}
