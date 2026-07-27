export const THEME_STORAGE_KEY = "subscriptions:theme";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

export function parseStoredPreference(raw: string | null): ThemePreference {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export function nextPreference(current: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(current);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}
