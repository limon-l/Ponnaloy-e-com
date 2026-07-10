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
