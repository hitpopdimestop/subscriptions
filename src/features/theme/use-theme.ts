"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  parseStoredPreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function handleStorageEvent(event: StorageEvent) {
  // Fires only in other tabs; the acting tab is notified directly by
  // `setPreference`. Cross-tab sync therefore needs no extra wiring.
  if (event.key === THEME_STORAGE_KEY) {
    notify();
  }
}

function subscribe(onStoreChange: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("storage", handleStorageEvent);
  }

  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);

    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function getSnapshot(): ThemePreference {
  try {
    return parseStoredPreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

/**
 * `system` is expressed by removing the attribute, letting `color-scheme: light
 * dark` on :root defer to the operating system. Light and dark pin it. No theme
 * resolution happens in JavaScript — CSS owns that.
 *
 * The switch is deliberately instant. A CSS transition cannot work here because
 * the tokens resolve through `light-dark()`, which follows the non-animatable
 * `color-scheme`, and a view transition was not worth the failure modes it
 * brought with it. `next-themes` disables theme transitions for similar reasons.
 */
function applyPreference(preference: ThemePreference) {
  const root = document.documentElement;

  if (preference === "system") {
    root.removeAttribute("data-theme");
    return;
  }

  root.setAttribute("data-theme", preference);
}

export function useTheme() {
  // Returns `system` on the server and for the hydrating render, then re-renders
  // with the stored value once hydration completes. That is what this hook is
  // for, so no `mounted` flag and no state-in-effect are needed.
  const preference = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Idempotent, and the single place the DOM is touched: the first application
  // after hydration, a click, and an update from another tab all land here.
  useEffect(() => {
    applyPreference(preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode). Nothing to read back, so the
      // preference cannot be held; the UI stays on the last readable value.
    }

    notify();
  }, []);

  return { preference, setPreference };
}
