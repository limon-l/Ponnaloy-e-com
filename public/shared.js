const API_BASE = "/api";

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });
  let payload = null;
  try { payload = await response.json(); } catch (error) { payload = null; }
  if (!response.ok) throw new Error((payload && payload.message) || "Request failed.");
  return payload;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyPrecise(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function createProductCard(product) {
  const wished = getWishlist().includes(product.id) ? " is-wished" : "";
  return `
    <article class="product-card" data-product-card>
      <a class="product-image" href="/product.html?id=${product.id}">
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" decoding="async">
        <div class="overlay"></div>
      </a>
      <button class="wishlist-btn${wished}" data-wishlist-toggle="${product.id}" aria-label="Toggle wishlist">
        <svg viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
      <div class="product-body">
        <div class="product-category">${product.category}</div>
        <h3><a href="/product.html?id=${product.id}">${product.name}</a></h3>
        <p>${product.shortDescription}</p>
        <div class="product-footer">
          <div class="price-wrap">
            <div class="price">${formatCurrency(product.price)}</div>
            <div class="compare-price">${formatCurrency(product.compareAtPrice)}</div>
          </div>
          <div class="rating">${"★".repeat(5)} ${product.rating.toFixed(1)}</div>
        </div>
        <div class="product-actions">
          <button class="button-secondary" data-add-cart="${product.id}">Add to cart</button>
          <a class="button-ghost" href="/product.html?id=${product.id}">View &rarr;</a>
        </div>
      </div>
    </article>
  `;
}

const ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
};

function toastType(title) {
  const t = title.toLowerCase();
  if (t.includes("added") || t.includes("placed") || t.includes("applied") || t.includes("welcome") || t.includes("created") || t.includes("promo") || t.includes("subscribed")) return "check";
  if (t.includes("removed") || t.includes("cleared") || t.includes("failed") || t.includes("error") || t.includes("invalid") || t.includes("empty") || t.includes("login")) return "error";
  return "info";
}

function toast() {
  const node = document.querySelector("[data-toast]");
  const icon = node?.querySelector("[data-toast-icon]");
  const title = node?.querySelector("[data-toast-title]");
  const message = node?.querySelector("[data-toast-message]");
  return { node, icon, title, message };
}

function showToast(titleText, messageText) {
  const { node, icon, title, message } = toast();
  if (!node || !title || !message) return;
  title.textContent = titleText;
  message.textContent = messageText;
  if (icon) {
    const type = toastType(titleText);
    icon.className = `toast-icon is-${type}`;
    icon.innerHTML = ICONS[type] || ICONS.info;
  }
  node.classList.add("open");
  window.clearTimeout(window.__ponnaloyToastTimer);
  window.__ponnaloyToastTimer = window.setTimeout(() => { node.classList.remove("open"); }, 3000);
}

function wireRevealAnimations(root = document) {
  const elements = root.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); instance.unobserve(entry.target); }
      });
    },
    { threshold: 0.15 },
  );
  elements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 60, 280)}ms`;
    observer.observe(element);
  });
}

function setActiveFilterButtons(activeCategory) {
  document.querySelectorAll("[data-category-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.categoryFilter === activeCategory);
  });
}

/* ── Wishlist ── */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem("ponnaloy-wishlist") || "[]"); } catch (e) { return []; }
}

function setWishlist(ids) {
  localStorage.setItem("ponnaloy-wishlist", JSON.stringify(ids));
}

function toggleWishlist(productId) {
  const wishlist = getWishlist();
  const idx = wishlist.indexOf(productId);
  if (idx > -1) { wishlist.splice(idx, 1); } else { wishlist.push(productId); }
  setWishlist(wishlist);
  Array.from(document.querySelectorAll(`[data-wishlist-toggle="${productId}"]`)).forEach((btn) => {
    const isWished = wishlist.includes(productId);
    btn.classList.toggle("is-wished", isWished);
    const svg = btn.querySelector("svg");
    if (svg) svg.setAttribute("fill", isWished ? "currentColor" : "none");
  });
  return wishlist;
}

/* ── Recently Viewed ── */
function addRecentlyViewed(product) {
  try {
    let viewed = JSON.parse(localStorage.getItem("ponnaloy-recent") || "[]");
    viewed = viewed.filter((v) => v.id !== product.id);
    viewed.unshift({ id: product.id, name: product.name, imageUrl: product.imageUrl, price: product.price, category: product.category });
    if (viewed.length > 8) viewed = viewed.slice(0, 8);
    localStorage.setItem("ponnaloy-recent", JSON.stringify(viewed));
  } catch (e) { /* ignore */ }
}

function renderRecentlyViewed() {
  const container = document.querySelector("[data-recently-viewed]");
  if (!container) return;
  try {
    const viewed = JSON.parse(localStorage.getItem("ponnaloy-recent") || "[]");
    if (viewed.length < 2) { container.style.display = "none"; return; }
    container.style.display = "block";
    container.innerHTML = `
      <div class="container" style="padding-top: 0; padding-bottom: 18px;">
        <div class="section-header" style="margin-bottom: 14px;">
          <div><h2 class="section-title" style="font-size: 1.4rem;">Recently viewed</h2></div>
        </div>
        <div class="recently-viewed">
          ${viewed.map((v) => `
            <a class="mini-card" href="/product.html?id=${v.id}">
              <img src="${v.imageUrl}" alt="${v.name}" loading="lazy" />
              <strong>${v.name}</strong>
              <span>${v.category}</span>
            </a>
          `).join("")}
        </div>
      </div>
    `;
  } catch (e) { container.style.display = "none"; }
}

/* ── Back to Top ── */
function initBackToTop() {
  const btn = document.querySelector("[data-back-to-top]");
  if (!btn) return;
  const onScroll = () => { btn.classList.toggle("is-visible", window.scrollY > 400); };
  window.addEventListener("scroll", onScroll, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ── Newsletter ── */
function initNewsletter() {
  const form = document.querySelector("[data-newsletter-form]");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.querySelector("input[type=email]");
    const email = input?.value.trim();
    if (!email) { showToast("Email required", "Please enter an email address."); return; }
    try {
      await api("/newsletter", { method: "POST", body: JSON.stringify({ email }) });
      input.value = "";
      showToast("Subscribed", "Thank you for joining the Ponnaloy newsletter!");
    } catch (err) {
      showToast("Error", err.message);
    }
  });
}

/* ── Confetti ── */
function fireConfetti() {
  const container = document.createElement("div");
  container.className = "confetti-container";
  document.body.appendChild(container);
  const colors = ["#7ef4d2", "#8f9bff", "#ffb86c", "#ff6b7a", "#ffd77b", "#fff"];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = `${4 + Math.random() * 6}px`;
    piece.style.height = `${4 + Math.random() * 6}px`;
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 4000);
}

/* ── Skeleton Removal ── */
function removeSkeletons(container) {
  if (!container) return;
  container.querySelectorAll(".skeleton-card").forEach((s) => s.remove());
}

/* ── Image Zoom ── */
function initImageZoom(img) {
  if (!img) return;
  img.classList.add("image-zoom");
  img.style.cursor = "zoom-in";
  img.addEventListener("click", () => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:200;background:rgba(2,6,12,0.9);display:grid;place-items:center;cursor:zoom-out;animation:fadeIn 200ms ease";
    const clone = img.cloneNode();
    clone.style.cssText = "max-width:80vw;max-height:80vh;border-radius:20px;object-fit:contain";
    overlay.appendChild(clone);
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  });
}

/* ── Boot shared features ── */
document.addEventListener("DOMContentLoaded", () => {
  initBackToTop();
  initNewsletter();
  renderRecentlyViewed();
});
