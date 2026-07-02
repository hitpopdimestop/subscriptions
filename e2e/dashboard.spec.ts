import { expect, test, type Page } from "@playwright/test";

async function createSubscription(
  page: Page,
  planName: string,
  amountCents: string,
  billingIntervalMs: string,
) {
  await page.getByRole("button", { name: /add subscription/i }).click();
  await expect(page.getByLabel("Plan")).toBeVisible();
  await page.getByLabel("Plan").fill(planName);
  await page.getByLabel("Amount (USD cents)").fill(amountCents);
  await page.getByLabel("Interval (ms)").fill(billingIntervalMs);
  await page.getByRole("button", { name: "Create", exact: true }).click();
}

test("create in one tab updates that tab and marks another tab stale", async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  const planName = `Create sync ${Date.now()}`;

  await pageA.goto("/");
  await pageB.goto("/");

  await createSubscription(pageA, planName, "2222", "1900");

  await expect(pageA.getByRole("heading", { name: planName })).toBeVisible();
  await expect(pageB.getByTestId("stale-subscriptions-toast")).toBeVisible();

  await context.close();
});

test("pause, resume, and cancel propagate across tabs", async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto("/");
  await pageB.goto("/");

  const rowA = pageA.getByTestId("subscription-sub_008");
  const rowB = pageB.getByTestId("subscription-sub_008");

  await expect(rowA).toBeVisible();
  await rowA.getByRole("button", { name: "Pause Studio" }).click();
  const pauseDialog = pageA.getByRole("dialog");
  await expect(pauseDialog).toBeVisible();
  await pauseDialog.getByRole("button", { name: /indefinite/i }).click();
  await pauseDialog.getByRole("button", { name: /apply pause/i }).click();
  await expect(rowB).toContainText("paused");

  await rowA.getByRole("button", { name: "Resume Studio" }).click();
  await expect(rowB).toContainText("active");

  await rowA.getByRole("button", { name: "Cancel Studio" }).click();
  await expect(rowB).toContainText("canceled");

  await context.close();
});

test("offline reconnect replays missed events and marks the list stale", async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  const planName = `Offline replay ${Date.now()}`;

  await pageA.goto("/");
  await pageB.goto("/");

  await pageB.getByRole("button", { name: /go offline/i }).click();

  await createSubscription(pageA, planName, "3333", "1800");

  await expect(pageA.getByRole("heading", { name: planName })).toBeVisible();
  await expect(pageB.getByTestId("stale-subscriptions-toast")).toHaveCount(0);

  await pageB.getByRole("button", { name: /go online/i }).click();
  await expect(pageB.getByTestId("stale-subscriptions-toast")).toBeVisible();

  await context.close();
});

test("expired replay switches the UI into reload-required", async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto("/");
  await pageB.goto("/");

  await pageB.getByRole("button", { name: /go offline/i }).click();

  await createSubscription(pageA, `Replay old ${Date.now()}`, "4444", "1700");

  await pageA.waitForTimeout(1700);

  await createSubscription(pageA, `Replay new ${Date.now()}`, "5555", "1600");

  await pageB.getByRole("button", { name: /go online/i }).click();
  await expect(pageB.getByTestId("reload-required")).toBeVisible({ timeout: 7000 });

  await context.close();
});
