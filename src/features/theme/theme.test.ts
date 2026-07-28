import { describe, expect, it } from "vitest";
import {
  nextPreference,
  parseStoredPreference,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from "./theme";

describe("THEME_STORAGE_KEY", () => {
  it("uses the namespaced key from the spec", () => {
    expect(THEME_STORAGE_KEY).toBe("subscriptions:theme");
  });
});

describe("parseStoredPreference", () => {
  it("accepts the three valid preferences", () => {
    expect(parseStoredPreference("system")).toBe("system");
    expect(parseStoredPreference("light")).toBe("light");
    expect(parseStoredPreference("dark")).toBe("dark");
  });

  it("falls back to system for a missing value", () => {
    expect(parseStoredPreference(null)).toBe("system");
  });

  it("falls back to system for unparseable values", () => {
    expect(parseStoredPreference("")).toBe("system");
    expect(parseStoredPreference("DARK")).toBe("system");
    expect(parseStoredPreference("midnight")).toBe("system");
    expect(parseStoredPreference("{}")).toBe("system");
  });
});

describe("nextPreference", () => {
  it("cycles system -> light -> dark -> system", () => {
    expect(nextPreference("system")).toBe("light");
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("system");
  });

  it("cycles through every declared preference", () => {
    expect(THEME_PREFERENCES).toEqual(["system", "light", "dark"]);
  });
});
