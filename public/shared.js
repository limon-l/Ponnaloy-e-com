const API_BASE = "/api";

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "same-origin",
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error((payload && payload.message) || "Request failed.");
  }

  return payload;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyPrecise(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function createProductCard(product) {
  return `
    <article class="product-card reveal" data-product-card>
      <a class="product-image" href="/product.html?id=${product.id}">
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" decoding="async">
        <div class="overlay"></div>
      </a>
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
  if (t.includes("added") || t.includes("placed") || t.includes("applied") || t.includes("welcome") || t.includes("created") || t.includes("promo")) return "check";
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
  window.__ponnaloyToastTimer = window.setTimeout(() => {
    node.classList.remove("open");
  }, 3000);
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
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          instance.unobserve(entry.target);
        }
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
    const category = button.dataset.categoryFilter;
    button.classList.toggle("active", category === activeCategory);
  });
}
