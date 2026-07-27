"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  parseStoredPreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

const TRANSITION_CLASS = "theme-transition";
const TRANSITION_MS = 220;

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
 * Every application animates, including the one that adopts a stored preference
 * on load. Keeping a single path means there is no "was this deliberate?" branch
 * to reason about, and the load-time case only occurs for the few visitors who
 * have overridden their system setting.
 */
function applyPreference(preference: ThemePreference) {
  const root = document.documentElement;

  root.classList.add(TRANSITION_CLASS);

  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }

  window.setTimeout(
    () => root.classList.remove(TRANSITION_CLASS),
    TRANSITION_MS,
  );
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
