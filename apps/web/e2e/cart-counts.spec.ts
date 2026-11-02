import { test, expect } from "@playwright/test";

test("guest cart and wishlist counts follow add, quantity, reload and removal", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "Add to wishlist", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Remove from wishlist", exact: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ponnaloy_wishlist") || "[]").length)).toBe(1);

  await page.getByRole("button", { name: "Add to Cart", exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ponnaloy_cart") || "[]").reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0))).toBe(1);
  await page.goto("/cart");
  await page.locator("button").filter({ has: page.locator("svg.lucide-plus") }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ponnaloy_cart") || "[]")[0]?.quantity)).toBe(2);
  await page.reload();
  await expect(page.locator("span.tabular-nums").filter({ hasText: /^2$/ })).toBeVisible();
  await page.locator("button").filter({ has: page.locator("svg.lucide-minus") }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ponnaloy_cart") || "[]")[0]?.quantity)).toBe(1);
  await page.locator("button.text-destructive").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ponnaloy_cart") || "[]").length)).toBe(0);
  await expect(page.getByText("Your cart is empty", { exact: true })).toBeVisible();
});
