function renderStockBadge(stock) {
  if (stock > 10) return '<span class="stock-badge in-stock">In Stock</span>';
  if (stock > 0) return `<span class="stock-badge low-stock">Only ${stock} left in stock</span>`;
  return '<span class="stock-badge out-of-stock">Out of Stock</span>';
}

function renderStars(count) { return "★".repeat(Math.round(count)); }

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
    const related = catalog.products.filter((entry) => entry.category === product.category && entry.id !== product.id).slice(0, 4);

    addRecentlyViewed(product);

    detailNode.innerHTML = `
      <div class="split-layout grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
        <div class="detail-figure">
          <span class="badge">${product.badge}</span>
          <img src="${product.imageUrl}" alt="${product.name}" data-detail-image />
        </div>
        <div class="detail-grid">
          <div>
            <a class="icon-chip" href="/">&larr; Back to shop</a>
            <div class="rating-row">
              <div class="stars-group">
                ${renderStars(product.rating)}
                <span class="rating-value">${product.rating.toFixed(1)}</span>
              </div>
              <span class="rating-divider"></span>
            </div>
            <div class="stock-row">
              ${renderStockBadge(product.stock)}
              <span class="pill">${product.category}</span>
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
              <div class="qty-stepper">
                <label class="qty-label">Quantity:</label>
                <div class="stepper-wrap">
                  <button type="button" class="step-btn" data-qty-dec aria-label="Decrease quantity">&minus;</button>
                  <input type="number" id="qty" value="1" min="1" max="99" readonly />
                  <button type="button" class="step-btn" data-qty-inc aria-label="Increase quantity">+</button>
                </div>
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
      : `<div class="empty-card reveal" style="grid-column: 1 / -1;"><h3>No related items</h3><p class="section-copy">This product is already the standout in its category.</p></div>`;

    wireRevealAnimations(document);
    renderRecentlyViewed();

    const detailImg = document.querySelector("[data-detail-image]");
    initImageZoom(detailImg);

    const qtyInput = document.querySelector("#qty");
    document.querySelector("[data-qty-dec]")?.addEventListener("click", () => {
      const current = Number(qtyInput?.value || 1);
      if (current > 1) qtyInput.value = current - 1;
    });
    document.querySelector("[data-qty-inc]")?.addEventListener("click", () => {
      const current = Number(qtyInput?.value || 1);
      if (current < 99) qtyInput.value = current + 1;
    });

    document.querySelector("[data-detail-add]")?.addEventListener("click", () => {
      const qty = Number(qtyInput?.value || 1);
      addToCart(product, qty);
      renderCart();
      showToast("Added to cart", `${product.name} is now in your cart.`);
    });

    document.querySelectorAll("[data-add-cart]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = catalog.products.find((entry) => entry.id === Number(button.dataset.addCart));
        if (item) { addToCart(item, 1); renderCart(); showToast("Added to cart", `${item.name} is now in your cart.`); }
      });
    });
  } catch (error) {
    detailNode.innerHTML = `<div class="empty-card"><h3>Unable to load product</h3><p class="section-copy">${error.message}</p></div>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await refreshSession();
  renderCart();
  attachEvents();
  await loadProductPage();

  const searchInput = document.querySelector("[data-catalog-search]");
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });
});
