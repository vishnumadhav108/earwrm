import { expect, test as base, type Locator, type Page } from "@playwright/test";

/**
 * Shared e2e setup.
 * - MusicBrainz is never called: `/api/mb/*` is answered from the fixtures below.
 * - Every request to a host other than the local app or the local Supabase stack is
 *   blocked. Cover Art Archive images are expected and ignored. Any other outside
 *   request fails the test.
 */

export const RELEASES = [
  {
    id: "e2e00000-0000-4000-8000-000000000001",
    title: "E2E Test Album",
    artist: "Fixture Artist",
    year: 2024,
    type: "Album",
    initials: "ET",
    c1: "#1f1e1a",
    c2: "#2a2823",
    coverUrl: "https://coverartarchive.org/release-group/e2e00000-0000-4000-8000-000000000001/front-500",
  },
  {
    id: "e2e00000-0000-4000-8000-000000000002",
    title: "Second Fixture EP",
    artist: "Fixture Artist",
    year: 2023,
    type: "EP",
    initials: "SF",
    c1: "#1f1a1e",
    c2: "#2a2329",
    coverUrl: "https://coverartarchive.org/release-group/e2e00000-0000-4000-8000-000000000002/front-500",
  },
] as const;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export const test = base.extend<{ outsideRequests: string[] }>({
  outsideRequests: [
    async ({ page }, use) => {
      const outside: string[] = [];
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (LOCAL_HOSTS.has(url.hostname)) return route.fallback();
        if (url.hostname !== "coverartarchive.org") outside.push(url.host + url.pathname);
        return route.abort("blockedbyclient");
      });
      await page.route("**/api/mb/search**", (route) => route.fulfill({ json: { results: RELEASES } }));
      await page.route("**/api/mb/release-group/**", (route) => {
        const id = new URL(route.request().url()).pathname.split("/").pop();
        const r = RELEASES.find((x) => x.id === id) ?? RELEASES[0];
        return route.fulfill({
          json: {
            release: { ...r, label: "Fixture Records", blurb: "A release used by tests.", tracks: ["One", "Two"] },
          },
        });
      });
      await use(outside);
      expect(outside, "the app tried to reach an outside host").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Opens /demo and dismisses the welcome sheet that demo mode shows on every visit. */
export async function openDemo(page: Page) {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Start exploring" }).click();
}

/** Searches from an open search screen and picks a fixture release. */
export async function searchAndPick(page: Page, title: string) {
  await page.getByPlaceholder("Search artists and releases").fill("fixture");
  await page
    .getByRole("button", { name: new RegExp(title) })
    .first()
    .click();
}

/**
 * Drags a row left far enough to latch its swipe actions open (gestures.ts: OPEN_AT is
 * -48 px; COMMIT_AT, which deletes immediately, is -170 px). Starts mid-row, because the
 * right edge of queue and list rows is the drag-to-reorder handle.
 */
export async function swipeOpen(page: Page, row: Locator) {
  const box = await row.boundingBox();
  if (!box) throw new Error("row is not visible");
  const x = box.x + box.width * 0.55;
  const y = box.y + box.height / 2;
  // A real touch swipe, as on a phone, through Chromium's DevTools protocol. A mouse
  // drag would also fire a click on release, which browsers don't send after a touch
  // swipe. The list row closes itself on that click (known desktop bug, see handoff 02).
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", px?: number) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: px === undefined ? [] : [{ x: px, y }] });
  await touch("touchStart", x);
  for (let i = 1; i <= 10; i++) await touch("touchMove", x - i * 11);
  await touch("touchEnd");
  await cdp.detach();
}

/** The swipeable wrapper (the element with the swipe handlers) around a row's main button. */
export function swipeRow(page: Page, title: string): Locator {
  return page.getByText(title, { exact: true }).locator("xpath=ancestor::button[1]/..");
}

/** A swipe action button (EDIT / DELETE) belonging to the row that shows `title`. */
export function rowAction(page: Page, title: string, action: "EDIT" | "DELETE"): Locator {
  return swipeRow(page, title).locator("xpath=..").getByRole("button", { name: action, exact: true });
}

/** The row (a direct ancestor holding the star display) that shows `title`. */
export function rowWithTitle(page: Page, title: string): Locator {
  return page.getByText(title, { exact: true }).locator("xpath=ancestor::div[.//span[text()='★']][1]");
}

/** Number of fully filled stars in a row's star display. */
export async function filledStars(row: Locator): Promise<number> {
  return row.locator("span[style*='width: 100%']").count();
}
