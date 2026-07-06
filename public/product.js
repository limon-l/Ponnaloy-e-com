async function loadProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id") || "1";
  const detailNode = document.querySelector("[data-product-detail]");
  const relatedNode = document.querySelector("[data-related-products]");
  if (!detailNode || !relatedNode) return;

  try {
    const response = await api(`/products/${productId}`);
    const product = response.product;
    const catalog = await api("/products");
    const related = catalog.products
      .filter(
        (entry) =>
          entry.category === product.category && entry.id !== product.id,
      )
      .slice(0, 3);

    detailNode.innerHTML = `
      <div class="split-layout">
        <div class="detail-figure reveal">
          <span class="badge">${product.badge}</span>
          <img src="${product.imageUrl}" alt="${product.name}" />
        </div>
        <div class="detail-grid reveal">
          <div>
            <a class="icon-chip" href="/">← Back to shop</a>
            <div class="detail-meta">
              <span class="pill">${product.category}</span>
              <span class="pill">${product.stock} in stock</span>
              <span class="pill rating">${"★".repeat(5)} ${product.rating.toFixed(1)}</span>
            </div>
            <h1 class="detail-title">${product.name}</h1>
            <p class="detail-copy">${product.description}</p>
            <div class="hero-actions" style="margin: 18px 0 10px;">
              <div>
                <div class="price">${formatCurrencyPrecise(product.price)}</div>
                <div class="compare-price">${formatCurrencyPrecise(product.compareAtPrice)}</div>
              </div>
            </div>
            <div class="detail-form">
              <div class="quantity">
                <label class="section-copy" for="qty">Quantity</label>
                <input id="qty" name="qty" type="number" min="1" value="1" />
              </div>
              <div class="hero-actions" style="margin: 0;">
                <button class="button" data-detail-add="${product.id}">Add to cart</button>
                <button class="button-secondary" data-cart-open>Open cart</button>
              </div>
            </div>
            <div class="timeline-card" style="margin-top: 18px;">
              <h4>Why customers love it</h4>
              <p>Refined finish, dependable performance, and a premium unboxing feel. This product is part of the curated showcase collection used throughout the storefront.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    relatedNode.innerHTML = related.length
      ? related.map((item) => createProductCard(item)).join("")
      : `
        <div class="empty-card reveal" style="grid-column: 1 / -1;">
          <h3>No related items</h3>
          <p class="section-copy">This product is already the standout in its category.</p>
        </div>
      `;

    wireRevealAnimations(document);

    document
      .querySelector("[data-detail-add]")
      ?.addEventListener("click", () => {
        const qty = Number(document.querySelector("#qty")?.value || 1);
        addToCart(product, qty);
        renderCart();
        showToast("Added to cart", `${product.name} is now in your cart.`);
      });

    document.querySelectorAll("[data-add-cart]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = catalog.products.find(
          (entry) => entry.id === Number(button.dataset.addCart),
        );
        if (item) {
          addToCart(item, 1);
          renderCart();
          showToast("Added to cart", `${item.name} is now in your cart.`);
        }
      });
    });
  } catch (error) {
    detailNode.innerHTML = `
      <div class="empty-card">
        <h3>Unable to load product</h3>
        <p class="section-copy">${error.message}</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await refreshSession();
  renderCart();
  attachEvents();
  await loadProductPage();
});
