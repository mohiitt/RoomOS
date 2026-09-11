import { test, expect } from "@playwright/test";

test("PIN unlock to home is the apartment click-path", async ({ page }) => {
  test.skip(!process.env.E2E_PIN, "Set E2E_PIN to run against a live RoomOS.");
  await page.goto("/");
  await page.getByRole("button").first().click();
  await page.getByLabel(/PIN|digit/i).or(page.locator("input")).first().fill(process.env.E2E_PIN ?? "");
  await page.getByRole("button", { name: /unlock|continue|enter/i }).click();
  await expect(page.getByText(/Apartment vibe/i)).toBeVisible();
});
