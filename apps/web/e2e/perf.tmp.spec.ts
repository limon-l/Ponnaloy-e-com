import { test, expect, type Page } from "@playwright/test";

async function markClick(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`missing ${sel}`);
    el.addEventListener(
      "click",
      () => {
        (window as unknown as { __t0: number }).__t0 = performance.now();
      },
      { capture: true, once: true }
    );
  }, selector);
}

async function markAddToCart(page: Page) {
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find((el) =>
      /add to cart/i.test(el.textContent || "")
    );
    if (!button) throw new Error("missing add to cart button");
    button.addEventListener(
      "click",
      () => {
        (window as unknown as { __t0: number }).__t0 = performance.now();
      },
      { capture: true, once: true }
    );
  });
}

async function sinceClick(page: Page) {
  return page.evaluate(() =>
    Math.round(performance.now() - (window as unknown as { __t0: number }).__t0)
  );
}

test("measure storefront interaction latency (cold then warm)", async ({ page }) => {
  const results: Record<string, number> = {};

  for (const pass of ["cold", "warm"] as const) {
    let start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    results[`${pass}.home.domcontentloaded`] = Date.now() - start;
    await page.waitForSelector("a[href^='/product/']", { timeout: 30_000 });
    results[`${pass}.home.firstProductCard`] = Date.now() - start;

    await markClick(page, "a[href='/products']");
    await page.click("a[href='/products']");
    await page.waitForURL("**/products", { timeout: 30_000 });
    await page.waitForSelector("a[href^='/product/']", { timeout: 30_000 });
    results[`${pass}.nav.home->products`] = await sinceClick(page);

    const firstProduct = page.locator("a[href^='/product/']").first();
    const href = await firstProduct.getAttribute("href");
    await markClick(page, `a[href='${href}']`);
    await firstProduct.click();
    await page.waitForURL(`**${href}`, { timeout: 30_000 });
    await page.waitForSelector("h1", { timeout: 30_000 });
    results[`${pass}.nav.products->product`] = await sinceClick(page);

    const addButton = page.getByRole("button", { name: /add to cart/i }).first();
    await expect(addButton).toBeVisible();
    await markAddToCart(page);
    await addButton.click();
    await page.waitForSelector("text=Added to cart", { timeout: 15_000 });
    results[`${pass}.click.addToCart->toast`] = await sinceClick(page);
  }

  console.log("PERF_RESULTS " + JSON.stringify(results, null, 2));
});
