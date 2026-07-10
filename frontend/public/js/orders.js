let ordersState = {
  orders: [],
  filteredOrders: [],
  productsMap: {},
  statusFilter: "all",
  search: "",
  sort: "newest",
};

const STATUS_COLORS = {
  placed: "badge-amber",
  confirmed: "badge-blue",
  shipped: "badge-purple",
  delivered: "badge-green",
  cancelled: "badge-red",
};

function statusBadge(status) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const cls = STATUS_COLORS[status] || "badge-amber";
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr.replace(" ", "T") + "Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getProductImage(productId) {
  return ordersState.productsMap[productId] || "/images/placeholder.svg";
}

function getPaymentLabel(method) {
  const labels = {
    card: "Credit / Debit Card",
    paypal: "PayPal",
    cod: "Cash on Delivery",
  };
  return labels[method] || method;
}

function filterAndSortOrders() {
  const query = ordersState.search.trim().toLowerCase();
  let result = ordersState.orders.filter((order) => {
    if (ordersState.statusFilter !== "all" && order.status !== ordersState.statusFilter) return false;
    if (!query) return true;
    const idMatch = String(order.id).includes(query);
    const nameMatch = order.customerName.toLowerCase().includes(query);
    const productMatch = order.items.some((item) => item.productName.toLowerCase().includes(query));
    return idMatch || nameMatch || productMatch;
  });

  switch (ordersState.sort) {
    case "oldest":
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "price-high":
      result.sort((a, b) => b.total - a.total);
      break;
    case "price-low":
      result.sort((a, b) => a.total - b.total);
      break;
    default:
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }

  ordersState.filteredOrders = result;
  return result;
}

function updateStats(orders) {
  const totalNode = document.querySelector("[data-total-orders]");
  const deliveredNode = document.querySelector("[data-delivered-count]");
  const transitNode = document.querySelector("[data-transit-count]");
  if (totalNode) totalNode.textContent = orders.length;
  if (deliveredNode) deliveredNode.textContent = orders.filter((o) => o.status === "delivered").length;
  if (transitNode)
    transitNode.textContent = orders.filter((o) => o.status === "shipped" || o.status === "confirmed").length;
}

function renderOrderItems(items) {
  return items
    .map(
      (item) => `
    <div class="order-item-row">
      <img class="order-item-img" src="${getProductImage(item.productId)}" alt="${item.productName}" loading="lazy" />
      <div class="order-item-info">
        <strong>${item.productName}</strong>
        <span>Qty: ${item.quantity} &times; ${formatCurrencyPrecise(item.unitPrice)}</span>
      </div>
      <strong class="order-item-total">${formatCurrencyPrecise(item.lineTotal)}</strong>
    </div>
  `,
    )
    .join("");
}

function renderOrderCard(order) {
  const itemsSummary = order.items.map((item) => item.productName).join(", ");

  return `
    <article class="order-card reveal" data-order-id="${order.id}">
      <div class="order-card-header">
        <div class="order-card-meta">
          <strong class="order-id">Order #${order.id}</strong>
          <span class="order-date">${formatDate(order.createdAt)}</span>
          ${statusBadge(order.status)}
        </div>
        <div class="order-card-summary">
          <span class="order-count">${order.items.length} item${order.items.length !== 1 ? "s" : ""}</span>
          <span class="order-products">${itemsSummary}</span>
        </div>
        <div class="order-card-footer">
          <strong class="order-total">${formatCurrency(order.total)}</strong>
          <button class="button-ghost order-expand-btn" data-order-expand="${order.id}" aria-label="Toggle order details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><path d="M6 9l6 6 6-6"></path></svg>
          </button>
        </div>
      </div>
      <div class="order-details-collapse" data-order-details="${order.id}">
        <div class="order-details-inner">
          <div class="order-items-list">
            ${renderOrderItems(order.items)}
          </div>
          <div class="order-info-grid">
            <div class="order-info-block">
              <h4>Shipping Address</h4>
              <p>${order.shippingAddress}</p>
            </div>
            <div class="order-info-block">
              <h4>Phone</h4>
              <p>${order.phone}</p>
            </div>
            <div class="order-info-block">
              <h4>Payment Method</h4>
              <p>${getPaymentLabel(order.paymentMethod)}</p>
            </div>
          </div>
          ${order.promoCode ? `<div class="order-promo"><h4>Promo Code</h4><p class="promo-code">${order.promoCode}</p></div>` : ""}
          <div class="order-totals">
            <div class="summary-row"><span>Subtotal</span><strong>${formatCurrencyPrecise(order.subtotal)}</strong></div>
            <div class="summary-row"><span>Shipping</span><strong>${order.shippingFee === 0 ? "FREE" : formatCurrencyPrecise(order.shippingFee)}</strong></div>
            <div class="summary-row summary-total"><span>Total</span><strong>${formatCurrencyPrecise(order.total)}</strong></div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderOrders() {
  const list = document.querySelector("[data-orders-list]");
  if (!list) return;

  const filtered = filterAndSortOrders();
  updateStats(ordersState.orders);

  const noOrders = ordersState.orders.length === 0;
  const noMatch = ordersState.orders.length > 0 && filtered.length === 0;

  if (noOrders || noMatch) {
    list.innerHTML = `
      <div class="orders-empty" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 20px;">
        <div class="brand-mark" style="margin: 0 auto 16px;"><span>?</span></div>
        <h3 class="section-title" style="font-size: 1.25rem;">${noOrders ? "No orders yet" : "No orders match your filter"}</h3>
        <p class="section-copy">${
          noOrders
            ? "You haven't placed any orders yet. Start exploring our collection."
            : "Try adjusting your filters or search terms to find what you're looking for."
        }</p>
        ${noOrders ? '<a class="button" href="/products" style="margin-top: 20px;">Browse products</a>' : ""}
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((order) => renderOrderCard(order)).join("");
  wireRevealAnimations(list);
}

function openOrderModal(order) {
  const modal = document.querySelector("[data-order-modal]");
  const card = modal?.querySelector(".order-detail-card");
  if (!modal || !card) return;

  modal.querySelector("[data-order-detail-id]").textContent = `Order #${order.id}`;

  const itemsContainer = modal.querySelector("[data-order-detail-items]");
  if (itemsContainer) itemsContainer.innerHTML = renderOrderItems(order.items);

  const shippingNode = modal.querySelector("[data-order-detail-shipping]");
  if (shippingNode) shippingNode.textContent = order.shippingAddress;

  const paymentNode = modal.querySelector("[data-order-detail-payment]");
  if (paymentNode) paymentNode.textContent = getPaymentLabel(order.paymentMethod);

  const subtotalNode = modal.querySelector("[data-order-detail-subtotal]");
  if (subtotalNode) subtotalNode.textContent = formatCurrencyPrecise(order.subtotal);

  const shippingCostNode = modal.querySelector("[data-order-detail-shipping-cost]");
  if (shippingCostNode) shippingCostNode.textContent = order.shippingFee === 0 ? "FREE" : formatCurrencyPrecise(order.shippingFee);

  const taxNode = modal.querySelector("[data-order-detail-tax]");
  if (taxNode) taxNode.textContent = formatCurrencyPrecise(order.subtotal * 0.08);

  const totalNode = modal.querySelector("[data-order-detail-total]");
  if (totalNode) totalNode.textContent = formatCurrencyPrecise(order.total);

  const promoSection = card.querySelector(".modal-promo-section");
  if (promoSection) promoSection.remove();
  if (order.promoCode) {
    const section = document.createElement("div");
    section.className = "modal-promo-section order-detail-section";
    section.innerHTML = `<h4>Promo Code</h4><p>${order.promoCode}</p>`;
    const totalsSection = card.querySelector(".order-detail-section:last-child");
    if (totalsSection) totalsSection.parentNode.insertBefore(section, totalsSection);
  }

  gsap.killTweensOf([modal, card]);
  gsap.set(modal, { display: "grid", opacity: 0, visibility: "visible", pointerEvents: "auto" });
  gsap.set(card, { scale: 0.92, y: 40, opacity: 0, transformOrigin: "50% 50%" });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(modal, { opacity: 1, duration: 0.3, ease: "power2.out" }).to(
    card,
    { scale: 1, y: 0, opacity: 1, duration: 0.55, ease: "back.out(1.7)" },
    "-=0.1",
  );

  modal.classList.add("open");
}

function closeOrderModal() {
  const modal = document.querySelector("[data-order-modal]");
  if (!modal || !modal.classList.contains("open")) return;
  const card = modal.querySelector(".order-detail-card");

  gsap.killTweensOf([modal, card]);

  const tl = gsap.timeline({
    defaults: { ease: "power2.in" },
    onComplete() {
      modal.classList.remove("open");
      gsap.set(modal, { visibility: "hidden", pointerEvents: "none" });
    },
  });
  tl.to(card, { scale: 0.95, y: 25, opacity: 0, duration: 0.22 }).to(modal, { opacity: 0, duration: 0.18 }, "-=0.08");
}

async function loadOrders() {
  const skeleton = document.querySelector("[data-orders-skeleton]");
  try {
    const [ordersRes, productsRes] = await Promise.all([api("/orders"), api("/products")]);
    ordersState.orders = ordersRes.orders;
    ordersState.productsMap = {};
    productsRes.products.forEach((p) => {
      ordersState.productsMap[p.id] = p.imageUrl;
    });
    renderOrders();
  } catch (error) {
    if (skeleton) skeleton.style.display = "none";
    const list = document.querySelector("[data-orders-list]");
    if (list) {
      list.innerHTML = `
        <div class="orders-empty" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 20px;">
          <h3 class="section-title" style="font-size: 1.25rem;">Failed to load orders</h3>
          <p class="section-copy">${error.message}</p>
          <button class="button" style="margin-top: 20px;" onclick="loadOrders()">Try again</button>
        </div>
      `;
    }
    showToast("Failed to load orders", error.message);
  }
}

function toggleOrderExpand(orderId, btn) {
  const details = document.querySelector(`[data-order-details="${orderId}"]`);
  const card = btn.closest(".order-card");
  if (!details || !card) return;

  const isExpanding = !card.classList.contains("is-expanded");
  card.classList.toggle("is-expanded");

  if (isExpanding) {
    details.style.display = "block";
    details.style.height = "auto";
    const h = details.scrollHeight;
    details.style.height = "0";
    details.offsetHeight;
    details.style.height = h + "px";
    gsap.fromTo(
      details.querySelector(".order-details-inner"),
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", delay: 0.1 },
    );
    details.addEventListener(
      "transitionend",
      () => {
        if (card.classList.contains("is-expanded")) details.style.height = "auto";
      },
      { once: true },
    );
  } else {
    details.style.height = details.scrollHeight + "px";
    details.offsetHeight;
    details.style.height = "0";
  }
}

function attachOrderEvents() {
  document.querySelectorAll("[data-status-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      ordersState.statusFilter = chip.dataset.statusFilter;
      document.querySelectorAll("[data-status-filter]").forEach((c) => c.classList.toggle("active", c === chip));
      renderOrders();
    });
  });

  const searchInput = document.querySelector("[data-order-search]");
  searchInput?.addEventListener("input", (e) => {
    ordersState.search = e.target.value;
    renderOrders();
  });

  const sortSelect = document.querySelector("[data-order-sort]");
  sortSelect?.addEventListener("change", (e) => {
    ordersState.sort = e.target.value;
    renderOrders();
  });

  document.addEventListener("click", (event) => {
    const expandBtn = event.target.closest("[data-order-expand]");
    if (expandBtn) {
      event.stopPropagation();
      toggleOrderExpand(expandBtn.dataset.orderExpand, expandBtn);
      return;
    }

    const card = event.target.closest(".order-card");
    if (card && !event.target.closest("[data-order-expand]")) {
      const orderId = Number(card.dataset.orderId);
      const order = ordersState.orders.find((o) => o.id === orderId);
      if (order) openOrderModal(order);
      return;
    }

    const closeBtn = event.target.closest("[data-order-modal-close]");
    if (closeBtn) {
      closeOrderModal();
      return;
    }

    const modal = document.querySelector("[data-order-modal]");
    if (modal && event.target === modal) {
      closeOrderModal();
    }
  });
}

async function bootOrdersPage() {
  updateCartCount();
  renderCart();
  attachEvents();

  try {
    await refreshSession();
  } catch (error) {
    window.location.href = "/";
    return;
  }

  if (!state.currentUser) {
    window.location.href = "/";
    return;
  }

  syncCheckoutForm();
  wireRevealAnimations();

  await loadOrders();
  attachOrderEvents();
}

document.addEventListener("DOMContentLoaded", bootOrdersPage);
