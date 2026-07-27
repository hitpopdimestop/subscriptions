# Theme Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix PR review findings 2–4: inaccessible theme-token contrast and loss of theme changes when `localStorage` writes fail.

**Architecture:** Keep theme ownership in `src/features/theme` and the existing CSS semantic-token layer. Add an in-memory preference snapshot only as a fallback when storage is unavailable, and add dedicated foreground tokens for solid-danger and inverted-muted text so components no longer reuse incompatible foreground roles.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, Tailwind CSS 4, Vitest/jsdom, Playwright.

## Global Constraints

- Leave review finding 1 and the current CSS-only initial-theme strategy unchanged.
- Theme remains client-only and must not touch SSE, subscription state, or server routes.
- Normal-sized text must reach at least WCAG AA 4.5:1 contrast in both light and dark themes.
- Add no dependencies.
- Commit each reviewed task on `feat/dark-mode`; do not push.

---

### Task 1: Preserve theme changes when storage writes fail

**Files:**
- Create: `src/features/theme/use-theme.test.tsx`
- Modify: `src/features/theme/use-theme.ts`

**Interfaces:**
- Consumes: `useTheme(): { preference: ThemePreference; setPreference(next: ThemePreference): void }`
- Produces: the same public hook interface, with an in-memory snapshot used only when reading or writing `localStorage` fails.

- [ ] **Step 1: Write the failing hook test**

```tsx
// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => vi.restoreAllMocks());

  it("keeps a session preference when localStorage writes fail", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setPreference("dark"));

    expect(result.current.preference).toBe("dark");
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute("data-theme", "dark"),
    );
  });
});
```

- [ ] **Step 2: Verify the test fails for the existing implementation**

Run: `yarn test src/features/theme/use-theme.test.tsx`

Expected: FAIL because `notify()` rereads the unchanged stored value and returns `system`.

- [ ] **Step 3: Add the minimal in-memory fallback**

Maintain a module-local `ThemePreference | null` snapshot. Refresh it from valid storage reads, set it before attempting a write, and return it from the storage-read catch path. Preserve existing storage-event and `useSyncExternalStore` behavior.

- [ ] **Step 4: Verify the focused test passes**

Run: `yarn test src/features/theme/use-theme.test.tsx`

Expected: PASS with the preference and `<html data-theme>` both set to `dark` while storage remains unavailable.

### Task 2: Give danger-solid actions an accessible foreground

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/features/dashboard/components/dashboard-notices.tsx`
- Modify: `e2e/dashboard.spec.ts`

**Interfaces:**
- Produces: Tailwind utility `text-danger-solid-content`, backed by `--danger-solid-content`.

- [ ] **Step 1: Add a failing computed-contrast assertion to the existing reload-required E2E**

Set the page to dark mode, reach the real reload-required notice, read the reload button's computed foreground/background colors, and assert a hand-calculated WCAG contrast ratio of at least `4.5`.

- [ ] **Step 2: Verify the assertion fails**

Run: `yarn test:e2e --grep "expired replay switches" --reporter=line`

Expected: FAIL at approximately 2.5:1 for dark `rose-800` against dark `slate-950` text.

- [ ] **Step 3: Add and consume the solid-danger foreground token**

Define `--danger-solid-content` as a light foreground that passes on both danger-solid backgrounds, expose `--color-danger-solid-content`, and replace `text-content-inverted` on the reload button with `text-danger-solid-content`.

- [ ] **Step 4: Verify the reload-required E2E passes**

Run: `yarn test:e2e --grep "expired replay switches" --reporter=line`

Expected: PASS with contrast at or above 4.5:1.

### Task 3: Separate subtle text for normal and inverted surfaces

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/features/dashboard/components/pause-dialog.tsx`
- Create: `e2e/contrast.ts`
- Modify: `e2e/dashboard.spec.ts`
- Modify: `e2e/theme.spec.ts`

**Interfaces:**
- Produces: accessible `text-content-subtle` for normal surfaces and `text-content-inverted-muted` for inverted surfaces.

- [ ] **Step 1: Share the passing WCAG helper from Task 2**

Move the tested RGB parsing, relative-luminance, and contrast-ratio functions from `e2e/dashboard.spec.ts` into `e2e/contrast.ts`, export them, update the dashboard spec to import them, and rerun the existing expired-replay test to keep it green.

- [ ] **Step 2: Add failing real-UI contrast checks**

In both explicit light and dark modes, measure the actual transaction helper text against its panel background and a selected pause-option description against its button background. Assert each ratio is at least `4.5`.

- [ ] **Step 3: Verify the checks fail**

Run: `yarn test:e2e --grep "semantic helper text meets" --reporter=line`

Expected: FAIL for the existing subtle token on at least light normal surfaces and dark inverted surfaces.

- [ ] **Step 4: Split and apply the semantic roles**

Set normal `--content-subtle` to `light-dark(var(--color-slate-500), var(--color-slate-400))`. Add `--content-inverted-muted: light-dark(var(--color-slate-400), var(--color-slate-600))`, expose `--color-content-inverted-muted`, and use `text-content-inverted-muted` for selected pause-option descriptions while leaving unselected descriptions on `text-content-muted`.

- [ ] **Step 5: Verify the contrast checks pass**

Run: `yarn test:e2e --grep "semantic helper text meets" --reporter=line`

Expected: PASS in light and dark modes.

### Task 4: Full verification

**Files:**
- Review all files changed by Tasks 1–3.

- [ ] **Step 1: Run unit/integration tests**

Run: `yarn test`

Expected: all tests pass.

- [ ] **Step 2: Run the complete browser suite**

Run: `yarn test:e2e --reporter=line`

Expected: all e2e tests pass.

- [ ] **Step 3: Run static and production checks**

Run: `yarn lint`

Run: `yarn build`

Expected: both commands exit successfully with no errors.

- [ ] **Step 4: Inspect final scope**

Run: `git status --short` and `git diff --check`.

Expected: only the plan, tests, theme hook, CSS tokens, and the affected dashboard/e2e files are changed; no whitespace errors.
