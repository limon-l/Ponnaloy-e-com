import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { path: "/", name: "home" },
  { path: "/products", name: "catalogue" },
  { path: "/sellers", name: "seller directory" },
  { path: "/seller/apply", name: "seller application" },
];

test.describe("storefront smoke", () => {
  for (const page of PAGES) {
    test(`${page.name} renders without a client error`, async ({ page: browserPage }) => {
      const errors: string[] = [];
      browserPage.on("pageerror", (error) => errors.push(error.message));

      const response = await browserPage.goto(page.path, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBeLessThan(400);
      await expect(browserPage.locator("main, body").first()).toBeVisible();
      expect(errors, `uncaught errors on ${page.path}`).toEqual([]);
    });
  }

  test("catalogue exposes a product link and header navigation", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("banner")).toBeVisible();
    const productLinks = page.locator('a[href^="/product/"]');
    await expect(productLinks.first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("accessibility (axe, WCAG 2.2 AA tags)", () => {
  for (const page of PAGES) {
    test(`${page.name} has no critical or serious axe violations`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(page.path, { waitUntil: "networkidle" });

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious"
      );

      if (blocking.length > 0) {
        console.log(
          `axe violations on ${page.path}: ` +
            JSON.stringify(
              blocking.map((violation) => ({
                id: violation.id,
                impact: violation.impact,
                nodes: violation.nodes.length,
              }))
            )
        );
      }

      expect(blocking, `blocking axe violations on ${page.path}`).toEqual([]);
    });
  }
});
