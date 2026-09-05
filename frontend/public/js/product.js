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

    const discount = product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;
    const stars = product.rating >= 4.5 ? "★★★★★" : product.rating >= 3.5 ? "★★★★☆" : product.rating >= 2.5 ? "★★★☆☆" : "★★☆☆☆";
    const stockStatus = product.stock > 10 ? "in-stock" : product.stock > 0 ? "low-stock" : "out-of-stock";
    const stockLabel = product.stock > 10 ? "In Stock" : product.stock > 0 ? `Only ${product.stock} left` : "Out of Stock";
    const breadcrumb = document.querySelector("#breadcrumb-product");
    if (breadcrumb) breadcrumb.textContent = product.name;

    detailNode.innerHTML = `
      <div class="split-layout grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
        <div class="detail-gallery">
          <div class="detail-main-image">
            <img src="${product.imageUrl}" alt="${product.name}" data-detail-image />
            ${discount > 0 ? `<span class="product-badge badge-discount">-${discount}%</span>` : ""}
          </div>
        </div>
        <div class="detail-grid">
          <div>
            <div class="detail-badges">
              <span class="pill">${product.category}</span>
              ${product.brand ? `<span class="pill">${product.brand}</span>` : ""}
            </div>
            <h1 class="detail-title">${product.name}</h1>
            <div class="detail-rating">
              <span class="rating-stars">${stars}</span>
              <span class="rating-value">${product.rating.toFixed(1)}</span>
              <span class="rating-divider"></span>
              <span class="stock-badge ${stockStatus}">${stockLabel}</span>
            </div>
            <div class="detail-price-block">
              <span class="price">${formatCurrencyPrecise(product.price)}</span>
              ${discount > 0 ? `<span class="compare-price">${formatCurrencyPrecise(product.compareAtPrice)}</span>` : ""}
            </div>
            <p class="detail-copy">${product.description}</p>
            <div class="detail-form">
              <div class="qty-stepper">
                <label class="qty-label">Quantity:</label>
                <div class="stepper-wrap">
                  <button type="button" class="step-btn" data-qty-dec aria-label="Decrease quantity">&minus;</button>
                  <input type="number" id="qty" value="1" min="1" max="99" readonly />
                  <button type="button" class="step-btn" data-qty-inc aria-label="Increase quantity">+</button>
                </div>
              </div>
              <div class="detail-actions">
                <button class="button detail-add-btn" data-detail-add="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><path d="M6 6h15l-1.5 8h-11z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
                  <span class="btn-text">${product.stock <= 0 ? 'Out of stock' : 'Add to cart'}</span>
                </button>
                <button class="button-secondary" data-cart-open>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><path d="M6 6h15l-1.5 8h-11z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
                </button>
              </div>
            </div>
            <div class="trust-badges">
              <div class="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Secure checkout</span>
              </div>
              <div class="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                <span>Free shipping over $150</span>
              </div>
              <div class="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 0 1 9-9"/></svg>
                <span>30-day returns</span>
              </div>
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
    await loadReviews(productId);

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

    const addBtn = document.querySelector("[data-detail-add]");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const qty = Number(qtyInput?.value || 1);
        addToCart(product, qty);
        renderCart();
        animateAddToCart(addBtn);
        showToast("Added to cart", `${product.name} is now in your cart.`);
      });
    }

    document.querySelectorAll("[data-add-cart]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = catalog.products.find((entry) => entry.id === Number(button.dataset.addCart));
        if (item) { addToCart(item, 1); renderCart(); animateAddToCart(button); showToast("Added to cart", `${item.name} is now in your cart.`); }
      });
    });
  } catch (error) {
    detailNode.innerHTML = `
      <div class="error-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Unable to load product</h3>
        <p>${error.message}</p>
        <a href="/products" class="button">Back to catalog</a>
      </div>`;
  }
}

// ── Review State ──────────────────────────────────────────────────────────────
let reviewState = { rating: 0, reviews: [], stats: null, productId: null };

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ── Load Reviews ──────────────────────────────────────────────────────────────
async function loadReviews(productId) {
  try {
    const response = await api(`/reviews/product/${productId}`);
    reviewState.reviews = response.reviews;
    reviewState.stats = response.stats;
    reviewState.productId = productId;
    renderReviewStats();
    renderReviewsList();
  } catch (err) {
    console.error('Failed to load reviews:', err);
  }
}

// ── Render Review Stats ───────────────────────────────────────────────────────
function renderReviewStats() {
  const { stats } = reviewState;
  if (!stats) return;

  const avgEl = document.querySelector('[data-review-avg-number]');
  const starsEl = document.querySelector('[data-review-avg-stars]');
  const countEl = document.querySelector('[data-review-count]');
  const distEl = document.querySelector('[data-review-distribution]');
  const summaryEl = document.querySelector('[data-review-summary]');

  if (avgEl) avgEl.textContent = stats.avgRating.toFixed(1);
  if (starsEl) starsEl.innerHTML = '★'.repeat(Math.round(stats.avgRating)) + '☆'.repeat(5 - Math.round(stats.avgRating));
  if (countEl) countEl.textContent = `${stats.totalReviews} review${stats.totalReviews !== 1 ? 's' : ''}`;
  if (summaryEl) summaryEl.textContent = `Based on ${stats.totalReviews} customer review${stats.totalReviews !== 1 ? 's' : ''}`;

  if (distEl && stats.distribution) {
    distEl.innerHTML = [5, 4, 3, 2, 1].map(r => {
      const entry = stats.distribution.find(d => d.rating === r);
      const count = entry ? entry.count : 0;
      const pct = stats.totalReviews > 0 ? (count / stats.totalReviews * 100) : 0;
      return `<div class="review-dist-row">
        <span>${r} ★</span>
        <div class="review-dist-bar"><div class="review-dist-fill" style="width: ${pct}%"></div></div>
        <span>${count}</span>
      </div>`;
    }).join('');
  }
}

// ── Render Reviews List ───────────────────────────────────────────────────────
function renderReviewsList() {
  const container = document.querySelector('[data-reviews-list]');
  if (!container) return;
  if (!reviewState.reviews.length) {
    container.innerHTML = '<div class="empty-card"><h3>No reviews yet</h3><p class="section-copy">Be the first to review this product.</p></div>';
    return;
  }
  container.innerHTML = reviewState.reviews.map(r => `
    <article class="review-card">
      <div class="review-card-header">
        <div class="review-card-user">
          <span class="review-avatar">${(r.userName || 'U')[0].toUpperCase()}</span>
          <div>
            <strong>${escapeHtml(r.userName)}</strong>
            <span class="review-date">${timeAgo(r.createdAt)}</span>
          </div>
        </div>
        <div class="review-card-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      </div>
      ${r.title ? `<h4 class="review-card-title">${escapeHtml(r.title)}</h4>` : ''}
      ${r.comment ? `<p class="review-card-comment">${escapeHtml(r.comment)}</p>` : ''}
      ${state.currentUser && r.userId === state.currentUser.id ? `<button class="button-ghost" data-delete-review="${r.id}">Delete</button>` : ''}
    </article>
  `).join('');
}

// ── Review Form ───────────────────────────────────────────────────────────────
function initReviewForm() {
  const writeBtn = document.querySelector('[data-write-review]');
  const formContainer = document.querySelector('[data-review-form-container]');
  const closeBtn = document.querySelector('[data-close-review-form]');
  const submitBtn = document.querySelector('[data-submit-review]');
  const ratingInput = document.querySelector('[data-review-rating-input]');

  if (writeBtn) {
    writeBtn.addEventListener('click', () => {
      if (!state.currentUser) { openAuthModal('login'); showToast('Login required', 'Please sign in to write a review.'); return; }
      formContainer.hidden = !formContainer.hidden;
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => { formContainer.hidden = true; });

  if (ratingInput) {
    ratingInput.querySelectorAll('[data-rating]').forEach(btn => {
      btn.addEventListener('click', () => {
        reviewState.rating = Number(btn.dataset.rating);
        ratingInput.querySelectorAll('[data-rating]').forEach((b, i) => {
          b.classList.toggle('active', i < reviewState.rating);
        });
      });
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!reviewState.rating) { showToast('Rating required', 'Please select a star rating.'); return; }
      const title = document.querySelector('[data-review-title]')?.value || '';
      const comment = document.querySelector('[data-review-comment]')?.value || '';
      try {
        await api('/reviews', {
          method: 'POST',
          body: JSON.stringify({ productId: reviewState.productId, rating: reviewState.rating, title, comment }),
        });
        formContainer.hidden = true;
        reviewState.rating = 0;
        document.querySelector('[data-review-title]').value = '';
        document.querySelector('[data-review-comment]').value = '';
        ratingInput.querySelectorAll('[data-rating]').forEach(b => b.classList.remove('active'));
        loadReviews(reviewState.productId);
        showToast('Review submitted', 'Thank you for your review!');
      } catch (err) {
        showToast('Error', err.message);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await refreshSession();
  renderCart();
  attachEvents();
  await loadProductPage();
  initReviewForm();

  const searchInput = document.querySelector("[data-catalog-search]");
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });

  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-review]');
    if (deleteBtn) {
      const reviewId = deleteBtn.dataset.deleteReview;
      if (confirm('Are you sure you want to delete this review?')) {
        api(`/reviews/${reviewId}`, { method: 'DELETE' })
          .then(() => { loadReviews(reviewState.productId); showToast('Review deleted', 'Your review has been removed.'); })
          .catch(err => showToast('Error', err.message));
      }
    }
  });
});
