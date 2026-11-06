import {
  expect,
  filledStars,
  openDemo,
  rowAction,
  rowWithTitle,
  searchAndPick,
  swipeOpen,
  swipeRow,
  test,
} from "./fixtures";

/** Clicks a 0-5 star picker at the position for `stars` whole stars. */
async function rate(page: import("@playwright/test").Page, stars: number) {
  const picker = page.locator("div[style*='touch-action: none']").first();
  const box = await picker.boundingBox();
  if (!box) throw new Error("star picker not visible");
  await page.mouse.click(box.x + (box.width * (stars - 0.25)) / 5, box.y + box.height / 2);
}

test("log an album with a rating, and it shows at the top of the diary", async ({ page }) => {
  await openDemo(page);
  const previousTop = page.getByText("In Rainbows", { exact: true });
  await expect(previousTop).toBeVisible();

  await page.getByRole("button", { name: "Log a release" }).click();
  await searchAndPick(page, "E2E Test Album");
  await page.getByRole("button", { name: "Review or log" }).click();
  await expect(page.getByText("New log")).toBeVisible();
  await rate(page, 4);
  await page.getByRole("button", { name: "Save" }).first().click();

  const logged = page.getByText("E2E Test Album", { exact: true });
  await expect(logged).toBeVisible();
  const [a, b] = [await logged.boundingBox(), await previousTop.boundingBox()];
  expect(a!.y, "the new entry is above the previous top entry").toBeLessThan(b!.y);
  expect(await filledStars(rowWithTitle(page, "E2E Test Album"))).toBe(4);
});

test("add an album to the queue, then remove it", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Queue" }).click();
  await page.getByRole("button", { name: "Add to queue" }).click();
  await searchAndPick(page, "Second Fixture EP");

  const item = page.getByText("Second Fixture EP", { exact: true });
  await expect(item).toBeVisible();

  await swipeOpen(page, swipeRow(page, "Second Fixture EP"));
  await rowAction(page, "Second Fixture EP", "DELETE").click();
  await expect(item).toHaveCount(0);
});

test("create a list, add an album to it, then delete the list", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Lists" }).click();
  await page.getByRole("button", { name: "New list" }).click();
  await page.getByPlaceholder("Sunday morning").fill("E2E list");
  await page.getByRole("button", { name: "Create" }).click();

  const listTitle = page.getByText("E2E list", { exact: true });
  await expect(listTitle).toBeVisible();
  await listTitle.click();
  await page.getByRole("button", { name: "Add to list" }).click();
  await searchAndPick(page, "E2E Test Album");
  await expect(page.getByText("E2E Test Album", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(listTitle).toBeVisible();
  await swipeOpen(page, swipeRow(page, "E2E list"));
  await rowAction(page, "E2E list", "DELETE").click();
  await expect(page.getByText("Delete this list?")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(listTitle).toHaveCount(0);
});
