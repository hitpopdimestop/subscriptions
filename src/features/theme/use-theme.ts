"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  parseStoredPreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

const listeners = new Set<() => void>();
let sessionPreference: ThemePreference | null = null;
let storageWriteFailed = false;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// `storage` fires only in other tabs; the acting tab notifies itself.
function handleStorageEvent(event: StorageEvent) {
  if (event.key === THEME_STORAGE_KEY) {
    sessionPreference = parseStoredPreference(event.newValue);
    storageWriteFailed = false;
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
  if (storageWriteFailed) {
    return sessionPreference ?? "system";
  }

  try {
    const preference = parseStoredPreference(
      window.localStorage.getItem(THEME_STORAGE_KEY),
    );
    sessionPreference = preference;
    return preference;
  } catch {
    return sessionPreference ?? "system";
  }
}

// Holds the server and hydrating renders on `system` so the markup always matches.
function getServerSnapshot(): ThemePreference {
  return "system";
}

// `system` is the absence of the attribute, letting `color-scheme: light dark`
// defer to the OS. CSS resolves light versus dark; this module never does.
function applyPreference(preference: ThemePreference) {
  const root = document.documentElement;

  if (preference === "system") {
    root.removeAttribute("data-theme");
    return;
  }

  root.setAttribute("data-theme", preference);
}

export function useTheme() {
  const preference = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    applyPreference(preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    sessionPreference = next;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      storageWriteFailed = false;
    } catch {
      storageWriteFailed = true;
    }

    notify();
  }, []);

  return { preference, setPreference };
}
