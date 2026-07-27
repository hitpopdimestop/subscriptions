import { expect, test, type Page } from "@playwright/test";

function bodyBackground(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

function colorScheme(page: Page) {
  return page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  );
}

test("toggling the theme updates the document and persists across reload", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/");

  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toHaveAttribute("data-preference", "system");
  // `system` is the absence of the attribute, not a value it can hold.
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);

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

test("the operating system preference is honoured by CSS alone", async ({
  browser,
}) => {
  // No stored preference and no script: the correct theme has to come from
  // `color-scheme` plus `light-dark()` during initial parse.
  const darkContext = await browser.newContext({ colorScheme: "dark" });
  const darkPage = await darkContext.newPage();
  await darkPage.goto("/");

  await expect(darkPage.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  expect(await colorScheme(darkPage)).toBe("light dark");
  const darkBackground = await bodyBackground(darkPage);
  await darkContext.close();

  const lightContext = await browser.newContext({ colorScheme: "light" });
  const lightPage = await lightContext.newPage();
  await lightPage.goto("/");

  await expect(lightPage.locator("html")).not.toHaveAttribute(
    "data-theme",
    /.*/,
  );
  expect(await colorScheme(lightPage)).toBe("light dark");
  const lightBackground = await bodyBackground(lightPage);
  await lightContext.close();

  // Same markup and same `color-scheme` in both runs, so a difference here can
  // only come from `light-dark()` resolving against the OS setting.
  expect(darkBackground).not.toBe(lightBackground);
});

test("an explicit preference overrides the operating system setting", async ({
  browser,
}) => {
  // OS says dark, the user chose light: the stored preference must win.
  const context = await browser.newContext({ colorScheme: "dark" });
  await context.addInitScript(() => {
    window.localStorage.setItem("subscriptions:theme", "light");
  });

  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await colorScheme(page)).toBe("light");

  await context.close();
});

test("the page loads without console errors in every theme", async ({
  browser,
}) => {
  // Regression guard: hydration mismatches and script-tag warnings surface only
  // as console errors, and are invisible to assertions on the DOM.
  for (const preference of ["system", "light", "dark"] as const) {
    const context = await browser.newContext();
    await context.addInitScript((value) => {
      if (value === "system") {
        window.localStorage.removeItem("subscriptions:theme");
        return;
      }

      window.localStorage.setItem("subscriptions:theme", value);
    }, preference);

    const page = await context.newPage();
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page.getByTestId("theme-toggle")).toHaveAttribute(
      "data-preference",
      preference,
    );

    expect(errors, `console errors with preference "${preference}"`).toEqual([]);
    await context.close();
  }
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
