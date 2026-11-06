import { expect, filledStars, rowWithTitle, searchAndPick, test } from "./fixtures";

/**
 * The real app against the local Supabase stack (not /demo): sign up, log an entry,
 * reload, and the entry is still there. This exercises the session cookie, the proxy,
 * RLS and the release cache write together. Each run signs up a new user, so it doesn't
 * depend on database state.
 */
test("sign up, log an entry, reload, and it's still there", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@earwrm.test`;

  await page.goto("/login");
  await page.getByRole("button", { name: /Sign up/ }).click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("e2e-local-only-password");
  await page.getByRole("button", { name: "Create account" }).click();

  // Email confirmations are off on the local stack, so sign-up lands in the app.
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Log a release" }).click();
  await searchAndPick(page, "E2E Test Album");
  await page.getByRole("button", { name: "Review or log" }).click();

  const picker = page.locator("div[style*='touch-action: none']").first();
  const box = (await picker.boundingBox())!;
  await page.mouse.click(box.x + (box.width * 2.75) / 5, box.y + box.height / 2); // 3 stars
  await page.getByRole("button", { name: "Save" }).first().click();

  const logged = page.getByText("E2E Test Album", { exact: true });
  await expect(logged).toBeVisible();
  // No "Not saved" dialog means every write reached the database.
  await expect(page.getByText("Not saved")).toHaveCount(0);

  await page.reload();
  await expect(logged).toBeVisible();
  expect(await filledStars(rowWithTitle(page, "E2E Test Album"))).toBe(3);
});
