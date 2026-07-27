import { expect, test } from "@playwright/test";

test("toggling the theme updates the document and persists across reload", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/");

  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toHaveAttribute("data-preference", "system");

  await toggle.click();
  await expect(toggle).toHaveAttribute("data-preference", "light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await toggle.click();
  await expect(toggle).toHaveAttribute("data-preference", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByTestId("theme-toggle")).toHaveAttribute(
    "data-preference",
    "dark",
  );

  await context.close();
});

test("stored preference is applied on the initial document, before hydration", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.localStorage.setItem("subscriptions:theme", "dark");
  });

  const page = await context.newPage();
  await page.goto("/", { waitUntil: "commit" });

  // Asserted before hydration completes: proves the blocking script, not React,
  // set the attribute. This is the deterministic stand-in for "no flash".
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await context.close();
});

test("theme change in one tab propagates to another tab", async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto("/");
  await pageB.goto("/");

  await pageA.getByTestId("theme-toggle").click();
  await pageA.getByTestId("theme-toggle").click();
  await expect(pageA.locator("html")).toHaveAttribute("data-theme", "dark");

  await expect(pageB.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(pageB.getByTestId("theme-toggle")).toHaveAttribute(
    "data-preference",
    "dark",
  );

  await context.close();
});
