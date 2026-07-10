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

/* ── Parallax Scroll ── */
function wireParallaxElements() {
  const elements = document.querySelectorAll("[data-parallax]");
  if (!elements.length || !("IntersectionObserver" in window)) return;

  let ticking = false;

  function update() {
    const scrollY = window.scrollY;
    elements.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.3;
      const rect = el.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) return;
      const offset = (scrollY - el.offsetTop + window.innerHeight) * speed;
      el.style.transform = `translateY(${offset * 0.15}px)`;
    });
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
}

/* ── Animated Counters ── */
function animateCounters() {
  const counters = document.querySelectorAll("[data-count-to]");
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      instance.unobserve(el);
      const target = parseInt(el.dataset.countTo, 10);
      if (isNaN(target)) return;
      const duration = parseInt(el.dataset.countDuration, 10) || 1500;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }, { threshold: 0.3 });

  counters.forEach((c) => observer.observe(c));
}

/* ── User Menu Dropdown ── */
function initUserMenu() {
  const signInBtn = document.querySelector("[data-sign-in]");
  if (!signInBtn) return;

  api("/auth/me").then((user) => {
    if (!user) return;

    signInBtn.textContent = user.name.split(" ")[0];
    signInBtn.removeAttribute("href");

    const dropdown = document.createElement("div");
    dropdown.className = "user-dropdown";
    dropdown.style.cssText = "display:none;position:absolute;top:100%;right:0;margin-top:8px;background:var(--bg-card,#1a1f2e);border:1px solid var(--border,#2a3040);border-radius:12px;min-width:220px;z-index:100;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.35);";

    dropdown.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid var(--border,#2a3040);">
        <div style="font-weight:600;color:var(--text,#f0f0f0);font-size:0.95rem;">${user.name}</div>
        <div style="font-size:0.8rem;color:var(--text-muted,#8892a4);margin-top:2px;word-break:break-all;">${user.email}</div>
      </div>
      <nav style="padding:8px 0;">
        <a href="/dashboard" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text,#f0f0f0);text-decoration:none;font-size:0.9rem;transition:background 150ms;">Dashboard</a>
        <a href="/orders" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text,#f0f0f0);text-decoration:none;font-size:0.9rem;transition:background 150ms;">Orders</a>
        ${user.isAdmin ? '<a href="/admin" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text,#f0f0f0);text-decoration:none;font-size:0.9rem;transition:background 150ms;">Admin</a>' : ""}
        <button data-sign-out style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--error,#ff6b7a);background:none;border:none;cursor:pointer;width:100%;font-size:0.9rem;font-family:inherit;text-align:left;transition:background 150ms;">Sign out</button>
      </nav>
    `;

    dropdown.querySelectorAll("a").forEach((link) => {
      link.addEventListener("mouseenter", () => { link.style.background = "var(--surface,#22283a)"; });
      link.addEventListener("mouseleave", () => { link.style.background = "transparent"; });
    });

    const signOutBtn = dropdown.querySelector("[data-sign-out]");
    if (signOutBtn) {
      signOutBtn.addEventListener("mouseenter", () => { signOutBtn.style.background = "rgba(255,107,122,0.1)"; });
      signOutBtn.addEventListener("mouseleave", () => { signOutBtn.style.background = "transparent"; });
      signOutBtn.addEventListener("click", async () => {
        try { await api("/auth/signout", { method: "POST" }); } catch (e) { /* continue */ }
        window.location.href = "/";
      });
    }

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    signInBtn.parentNode.insertBefore(wrapper, signInBtn);
    wrapper.appendChild(signInBtn);
    wrapper.appendChild(dropdown);

    wrapper.addEventListener("mouseenter", () => { dropdown.style.display = "block"; });
    wrapper.addEventListener("mouseleave", () => { dropdown.style.display = "none"; });
  }).catch(() => { /* not logged in — leave button as-is */ });
}

/* ── Format Date ── */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Relative Time ── */
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/* ── Status Badge ── */
function statusBadge(status) {
  if (!status) return "";
  const colors = {
    pending: "#ffb86c",
    processing: "#8f9bff",
    shipped: "#7ef4d2",
    delivered: "#4ade80",
    cancelled: "#ff6b7a",
    refunded: "#ff6b7a",
    active: "#4ade80",
    inactive: "#8892a4",
    paid: "#4ade80",
    unpaid: "#ffb86c",
    failed: "#ff6b7a",
  };
  const color = colors[status.toLowerCase()] || "#8892a4";
  return `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:0.78rem;font-weight:600;text-transform:capitalize;color:${color};background:${color}18;border:1px solid ${color}30;">${status}</span>`;
}

/* ── Debounce ── */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ── Boot shared features ── */
document.addEventListener("DOMContentLoaded", () => {
  initBackToTop();
  initNewsletter();
  renderRecentlyViewed();
  wireParallaxElements();
  animateCounters();
  initUserMenu();
});
