import { expect, test, type Locator, type Page } from "@playwright/test";
import { contrastRatio } from "./contrast";

function bodyBackground(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

function colorScheme(page: Page) {
  return page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  );
}

async function renderedColors(foreground: Locator, background: Locator) {
  const backgroundElement = await background.elementHandle();

  if (!backgroundElement) {
    throw new Error("Expected a visible contrast background.");
  }

  return foreground.evaluate((element, backgroundNode) => {
    const context = document.createElement("canvas").getContext("2d");

    if (!context) {
      throw new Error("Expected a canvas context for color normalization.");
    }

    const toRgb = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;

      return `rgb(${red}, ${green}, ${blue})`;
    };

    return {
      backgroundColor: toRgb(getComputedStyle(backgroundNode).backgroundColor),
      color: toRgb(getComputedStyle(element).color),
    };
  }, backgroundElement);
}

test("toggling the theme updates the document and persists across reload", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/");

  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toHaveAttribute("data-preference", "system");
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

  expect(darkBackground).not.toBe(lightBackground);
});

test("an explicit preference overrides the operating system setting", async ({
  browser,
}) => {
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

test("semantic helper text meets AA contrast on normal and inverted surfaces in explicit themes", async ({
  browser,
}) => {
  for (const preference of ["light", "dark"] as const) {
    const context = await browser.newContext();
    await context.addInitScript((value) => {
      window.localStorage.setItem("subscriptions:theme", value);
    }, preference);

    const page = await context.newPage();
    await page.goto("/");

    const transactionHelper = page.getByText("End of history");
    const transactionPanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Transactions" }) });
    const transactionColors = await renderedColors(transactionHelper, transactionPanel);

    expect(
      contrastRatio(transactionColors.color, transactionColors.backgroundColor),
      `transaction helper contrast in explicit ${preference} mode`,
    ).toBeGreaterThanOrEqual(4.5);

    await page.getByRole("button", { name: "Pause Studio" }).click();
    const selectedDescription = page.getByText("Resume quickly after a short pause.");
    const selectedOption = page.getByRole("button", {
      name: /1 second resume quickly after a short pause/i,
    });
    const selectedColors = await renderedColors(selectedDescription, selectedOption);

    expect(
      contrastRatio(selectedColors.color, selectedColors.backgroundColor),
      `selected pause description contrast in explicit ${preference} mode`,
    ).toBeGreaterThanOrEqual(4.5);

    await context.close();
  }
});

test("the page loads without console errors in every theme", async ({
  browser,
}) => {
  // Hydration mismatches surface only as console errors, never in the DOM.
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
