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

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("ponnaloy-cart") || "[]");
  } catch (error) {
    return [];
  }
}

function setCart(items) {
  localStorage.setItem("ponnaloy-cart", JSON.stringify(items));
  updateCartCount();
}

function clearCart() {
  setCart([]);
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      quantity,
      stock: product.stock,
    });
  }
  setCart(cart);
  return cart;
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart()
    .map((item) => (item.id === productId ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  setCart(cart);
  return cart;
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  setCart(cart);
  return cart;
}

function cartItemCount() {
  return getCart().reduce((count, item) => count + item.quantity, 0);
}

function updateCartCount() {
  const count = cartItemCount();
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(count);
  });
}

function moneySum(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

function moneySubtotal(cart) {
  return moneySum(cart);
}

function shippingFee(subtotal) {
  return subtotal > 150 ? 0 : 15;
}

function orderTotal(cart) {
  const subtotal = moneySubtotal(cart);
  return subtotal + shippingFee(subtotal);
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
          <a class="button-ghost" href="/product.html?id=${product.id}">→</a>
        </div>
      </div>
    </article>
  `;
}

function toast() {
  const node = document.querySelector("[data-toast]");
  const title = node?.querySelector("[data-toast-title]");
  const message = node?.querySelector("[data-toast-message]");
  return { node, title, message };
}

function showToast(titleText, messageText) {
  const { node, title, message } = toast();
  if (!node || !title || !message) return;
  title.textContent = titleText;
  message.textContent = messageText;
  node.classList.add("open");
  window.clearTimeout(window.__ponnaloyToastTimer);
  window.__ponnaloyToastTimer = window.setTimeout(() => {
    node.classList.remove("open");
  }, 2600);
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

function currencyToNumber(value) {
  return Number(String(value).replace(/[^0-9.]/g, ""));
}
