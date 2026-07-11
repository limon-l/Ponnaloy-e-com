let adminState = {
  activeTab: "overview",
  products: [],
  orders: [],
  users: [],
  stats: null,
  productSearch: "",
  productCategory: "all",
  ordersSearch: "",
  ordersStatus: "all",
  usersSearch: "",
  usersRole: "all",
};

/* ── Helpers ── */

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusBadge(status) {
  const map = {
    placed: "pending",
    confirmed: "processing",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    pending: "pending",
    processing: "processing",
  };
  return `<span class="admin-badge ${map[status] || "pending"}">${escapeHtml(status)}</span>`;
}

function userInitial(name) {
  return escapeHtml((name || "U").charAt(0).toUpperCase());
}

/* ── Modal helpers ── */

function openModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) el.classList.add("open");
}

function closeModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) el.classList.remove("open");
}

function ensureModalOverlays() {
  if (document.getElementById("admin-product-modal")) return;
  const productModal = document.createElement("div");
  productModal.className = "admin-modal-overlay";
  productModal.id = "admin-product-modal";
  productModal.innerHTML = `
    <div class="admin-modal">
      <h2 id="admin-product-modal-title">Add Product</h2>
      <p id="admin-product-modal-subtitle">Fill in the details below.</p>
      <form id="admin-product-form" novalidate>
        <input type="hidden" name="productId" value="" />
        <input class="input-field" type="text" name="name" placeholder="Product name" required />
        <select class="input-field admin-select" name="category" required>
          <option value="">Select category</option>
          <option value="Audio">Audio</option>
          <option value="Wearables">Wearables</option>
          <option value="Home">Home</option>
          <option value="Work">Work</option>
        </select>
        <textarea class="input-field" name="description" placeholder="Description" rows="3"></textarea>
        <div style="display:flex;gap:10px;">
          <input class="input-field" type="number" name="price" placeholder="Price" step="0.01" min="0" required />
          <input class="input-field" type="number" name="compareAtPrice" placeholder="Compare at price" step="0.01" min="0" />
        </div>
        <input class="input-field" type="url" name="imageUrl" placeholder="Image URL" />
        <div style="display:flex;gap:10px;">
          <input class="input-field" type="text" name="badge" placeholder="Badge (e.g. New, Sale)" value="New" />
          <input class="input-field" type="number" name="stock" placeholder="Stock" min="0" value="0" />
        </div>
        <label style="display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.6);font-size:0.85rem;margin-top:4px;">
          <input type="checkbox" name="featured" /> Featured product
        </label>
        <div class="admin-actions" style="margin-top:20px;">
          <button type="button" class="admin-btn admin-btn-secondary" data-admin-product-cancel>Cancel</button>
          <button type="submit" class="admin-btn admin-btn-primary">Save Product</button>
        </div>
      </form>
    </div>`;

  const orderModal = document.createElement("div");
  orderModal.className = "admin-modal-overlay";
  orderModal.id = "admin-order-modal";
  orderModal.innerHTML = `
    <div class="admin-modal" style="max-width:560px;">
      <h2>Order Details</h2>
      <p id="admin-order-modal-subtitle">—</p>
      <div id="admin-order-modal-body"></div>
      <div class="admin-actions" style="margin-top:20px;">
        <button type="button" class="admin-btn admin-btn-secondary" data-admin-order-cancel>Close</button>
      </div>
    </div>`;

  const deleteModal = document.createElement("div");
  deleteModal.className = "admin-modal-overlay";
  deleteModal.id = "admin-delete-modal";
  deleteModal.innerHTML = `
    <div class="admin-modal" style="max-width:400px;">
      <h2>Delete Product</h2>
      <p id="admin-delete-modal-message">Are you sure? This cannot be undone.</p>
      <div class="admin-actions" style="margin-top:20px;">
        <button type="button" class="admin-btn admin-btn-secondary" data-admin-delete-cancel>Cancel</button>
        <button type="button" class="admin-btn admin-btn-danger" id="admin-delete-confirm-btn">Delete</button>
      </div>
    </div>`;

  document.body.appendChild(productModal);
  document.body.appendChild(orderModal);
  document.body.appendChild(deleteModal);
}

/* ── Tab switching ── */

function switchTab(tab) {
  adminState.activeTab = tab;
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminTab === tab);
  });
  document.querySelectorAll("[data-admin-tab-btn]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminTabBtn === tab);
  });
  document.querySelectorAll("[data-admin-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.adminTabPanel === tab);
  });
  loadTabData(tab);
}

async function loadTabData(tab) {
  try {
    if (tab === "overview") await loadStats();
    else if (tab === "products") await loadAdminProducts();
    else if (tab === "orders") await loadAdminOrders();
    else if (tab === "users") await loadAdminUsers();
  } catch (err) {
    showToast("Load failed", err.message);
  }
}

/* ── Overview ── */

async function loadStats() {
  const response = await api("/admin/stats");
  adminState.stats = response.stats;
  renderStats(response.stats);
}

function renderStats(stats) {
  setText("[data-admin-stat-products]", stats.productCount.toLocaleString());
  setText("[data-admin-stat-users]", stats.userCount.toLocaleString());
  setText("[data-admin-stat-orders]", stats.orderCount.toLocaleString());
  setText("[data-admin-stat-revenue], [data-admin-summary-revenue]", formatCurrency(stats.totalRevenue));
  setText("[data-admin-summary-products]", stats.productCount.toLocaleString());
  setText("[data-admin-summary-users]", stats.userCount.toLocaleString());
  setText("[data-admin-summary-orders]", stats.orderCount.toLocaleString());

  renderRecentActivity(stats.recentOrders);
  renderLowStock(stats.lowStockProducts);
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
}

function renderRecentActivity(orders) {
  const tbody = document.querySelector("[data-admin-activity]");
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="admin-empty"><p>No recent orders yet.</p></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((order) => `
    <tr>
      <td>New order #${order.id}</td>
      <td>Order</td>
      <td>${statusBadge(order.status)}</td>
      <td>${formatDate(order.createdAt)}</td>
    </tr>
  `).join("");
}

function renderLowStock(products) {
  if (!products.length) return;
  const activityTbody = document.querySelector("[data-admin-activity]");
  if (!activityTbody) return;
  const lowStockRows = products.slice(0, 3).map((p) => `
    <tr>
      <td>Low stock: ${escapeHtml(p.name)}</td>
      <td>Product</td>
      <td><span class="admin-badge pending">${p.stock} left</span></td>
      <td>${formatDate(p.createdAt)}</td>
    </tr>
  `).join("");
  activityTbody.innerHTML += lowStockRows;
}

/* ── Products ── */

async function loadAdminProducts() {
  const response = await api("/admin/products");
  adminState.products = response.products;
  renderProductsTable();
}

function getFilteredProducts() {
  const query = adminState.productSearch.trim().toLowerCase();
  return adminState.products.filter((p) => {
    const matchesCat = adminState.productCategory === "all" || p.category === adminState.productCategory;
    const haystack = `${p.name} ${p.category}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesCat && matchesSearch;
  });
}

function renderProductsTable() {
  const tbody = document.querySelector("[data-admin-products-table]");
  if (!tbody) return;
  const filtered = getFilteredProducts();
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty"><p>No products found.</p></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((p) => `
    <tr>
      <td>
        <div class="admin-product-info">
          <img class="admin-img-thumb" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <span>${escapeHtml(p.shortDescription || p.description?.slice(0, 40) || "")}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(p.category)}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.stock}</td>
      <td>${p.rating?.toFixed?.(1) || "—"}</td>
      <td>
        <div class="admin-actions">
          <button class="admin-action-view" data-admin-view-product="${p.id}">View</button>
          <button class="admin-action-edit" data-admin-edit-product="${p.id}">Edit</button>
          <button class="admin-action-delete" data-admin-delete-product="${p.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openProductModal(product) {
  const form = document.getElementById("admin-product-form");
  const title = document.getElementById("admin-product-modal-title");
  const subtitle = document.getElementById("admin-product-modal-subtitle");
  if (!form) return;
  form.reset();
  if (product) {
    title.textContent = "Edit Product";
    subtitle.textContent = `Editing "${product.name}"`;
    form.productId.value = product.id;
    form.name.value = product.name || "";
    form.category.value = product.category || "";
    form.description.value = product.description || "";
    form.price.value = product.price ?? "";
    form.compareAtPrice.value = product.compareAtPrice ?? "";
    form.imageUrl.value = product.imageUrl || "";
    form.badge.value = product.badge || "New";
    form.stock.value = product.stock ?? 0;
    form.featured.checked = !!product.featured;
  } else {
    title.textContent = "Add Product";
    subtitle.textContent = "Fill in the details below.";
    form.productId.value = "";
  }
  openModal("admin-product-modal");
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const productId = form.productId.value;
  const body = {
    name: form.name.value.trim(),
    category: form.category.value,
    description: form.description.value.trim(),
    price: parseFloat(form.price.value) || 0,
    compareAtPrice: parseFloat(form.compareAtPrice.value) || 0,
    imageUrl: form.imageUrl.value.trim(),
    badge: form.badge.value.trim() || "New",
    stock: parseInt(form.stock.value, 10) || 0,
    featured: form.featured.checked,
  };
  if (!body.name) { showToast("Validation", "Product name is required."); return; }
  if (!body.category) { showToast("Validation", "Select a category."); return; }
  if (!body.price) { showToast("Validation", "Set a valid price."); return; }

  try {
    if (productId) {
      const response = await api(`/admin/products/${productId}`, { method: "PUT", body: JSON.stringify(body) });
      const idx = adminState.products.findIndex((p) => p.id === Number(productId));
      if (idx > -1) adminState.products[idx] = response.product;
      showToast("Updated", `"${body.name}" has been updated.`);
    } else {
      const response = await api("/admin/products", { method: "POST", body: JSON.stringify(body) });
      adminState.products.unshift(response.product);
      showToast("Created", `"${body.name}" has been added to the catalog.`);
    }
    closeModal("admin-product-modal");
    renderProductsTable();
  } catch (err) {
    showToast("Save failed", err.message);
  }
}

let pendingDeleteId = null;

function openDeleteConfirm(productId) {
  const product = adminState.products.find((p) => p.id === productId);
  if (!product) return;
  pendingDeleteId = productId;
  document.getElementById("admin-delete-modal-message").textContent =
    `Delete "${product.name}"? This action cannot be undone.`;
  openModal("admin-delete-modal");
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  pendingDeleteId = null;
  try {
    await api(`/admin/products/${id}`, { method: "DELETE" });
    adminState.products = adminState.products.filter((p) => p.id !== id);
    closeModal("admin-delete-modal");
    renderProductsTable();
    showToast("Deleted", "Product has been removed.");
  } catch (err) {
    showToast("Delete failed", err.message);
  }
}

/* ── Orders ── */

async function loadAdminOrders() {
  const response = await api("/admin/orders");
  adminState.orders = response.orders;
  renderOrdersTable();
}

function getFilteredOrders() {
  const query = adminState.ordersSearch.trim().toLowerCase();
  return adminState.orders.filter((o) => {
    const matchesStatus = adminState.ordersStatus === "all" || o.status === adminState.ordersStatus;
    const haystack = `${o.customerName} ${o.customerEmail} #${o.id}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesStatus && matchesSearch;
  });
}

function renderOrdersTable() {
  const tbody = document.querySelector("[data-admin-orders-table]");
  if (!tbody) return;
  const filtered = getFilteredOrders();
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty"><p>No orders found.</p></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((o) => `
    <tr>
      <td><strong style="color:#7ef4d2;">#${o.id}</strong></td>
      <td>
        <div class="admin-user-info">
          <div class="admin-user-avatar">${userInitial(o.customerName)}</div>
          <div>
            <strong>${escapeHtml(o.customerName)}</strong>
            <span>${escapeHtml(o.customerEmail)}</span>
          </div>
        </div>
      </td>
      <td>${o.items?.length || 0}</td>
      <td>${formatCurrency(o.total)}</td>
      <td>
        <select class="admin-status-select" data-admin-order-status="${o.id}">
          <option value="placed" ${o.status === "placed" ? "selected" : ""}>Placed</option>
          <option value="confirmed" ${o.status === "confirmed" ? "selected" : ""}>Confirmed</option>
          <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>Shipped</option>
          <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>Delivered</option>
          <option value="cancelled" ${o.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td>${formatDate(o.createdAt)}</td>
      <td>
        <div class="admin-actions">
          <button class="admin-action-view" data-admin-view-order="${o.id}">View</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function changeOrderStatus(orderId, status) {
  try {
    const response = await api(`/admin/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    const idx = adminState.orders.findIndex((o) => o.id === orderId);
    if (idx > -1) adminState.orders[idx] = response.order;
    showToast("Status updated", `Order #${orderId} is now "${status}".`);
  } catch (err) {
    showToast("Update failed", err.message);
    renderOrdersTable();
  }
}

function openOrderDetail(orderId) {
  const order = adminState.orders.find((o) => o.id === orderId);
  if (!order) return;
  const subtitle = document.getElementById("admin-order-modal-subtitle");
  const body = document.getElementById("admin-order-modal-body");
  subtitle.textContent = `Order #${order.id} — ${escapeHtml(order.customerName)}`;

  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.productName)}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">${formatCurrencyPrecise(item.unitPrice)}</td>
      <td style="text-align:right;">${formatCurrencyPrecise(item.lineTotal)}</td>
    </tr>
  `).join("");

  body.innerHTML = `
    <div class="admin-summary-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom:16px;">
      <div class="admin-summary-item"><strong>${formatCurrency(order.subtotal)}</strong><span>Subtotal</span></div>
      <div class="admin-summary-item"><strong>${formatCurrency(order.shippingFee)}</strong><span>Shipping</span></div>
      <div class="admin-summary-item"><strong>${formatCurrency(order.total)}</strong><span>Total</span></div>
    </div>
    <div style="margin-bottom:12px;font-size:0.85rem;color:rgba(255,255,255,0.5);">
      <p><strong style="color:rgba(255,255,255,0.7);">Status:</strong> ${statusBadge(order.status)}</p>
      <p><strong style="color:rgba(255,255,255,0.7);">Payment:</strong> ${escapeHtml(order.paymentMethod)}</p>
      <p><strong style="color:rgba(255,255,255,0.7);">Shipping to:</strong> ${escapeHtml(order.shippingAddress || "—")}</p>
      <p><strong style="color:rgba(255,255,255,0.7);">Phone:</strong> ${escapeHtml(order.phone || "—")}</p>
      <p><strong style="color:rgba(255,255,255,0.7);">Date:</strong> ${formatDate(order.createdAt)}</p>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>`;

  openModal("admin-order-modal");
}

/* ── Users ── */

async function loadAdminUsers() {
  const response = await api("/admin/users");
  adminState.users = response.users;
  renderUsersTable();
}

function getFilteredUsers() {
  const query = adminState.usersSearch.trim().toLowerCase();
  return adminState.users.filter((u) => {
    const matchesRole = adminState.usersRole === "all" ||
      (adminState.usersRole === "admin" && u.is_admin) ||
      (adminState.usersRole === "user" && !u.is_admin);
    const haystack = `${u.name} ${u.email} ${u.phone || ""}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesRole && matchesSearch;
  });
}

function renderUsersTable() {
  const tbody = document.querySelector("[data-admin-users-table]");
  if (!tbody) return;
  const filtered = getFilteredUsers();
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty"><p>No users found.</p></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((u) => `
    <tr>
      <td>
        <div class="admin-user-info">
          <div class="admin-user-avatar">${userInitial(u.name)}</div>
          <div>
            <strong>${escapeHtml(u.name)}</strong>
            <span>${escapeHtml(u.email)}</span>
          </div>
        </div>
      </td>
      <td><span class="admin-badge ${u.is_admin ? "admin" : "user"}">${u.is_admin ? "Admin" : "User"}</span></td>
      <td>${u.order_count ?? "—"}</td>
      <td>${formatDate(u.created_at)}</td>
      <td><span class="admin-badge delivered">Active</span></td>
      <td>
        <div class="admin-actions">
          <button class="admin-action-view" data-admin-view-user="${u.id}">View</button>
        </div>
      </td>
    </tr>
  `).join("");
}

/* ── Events ── */

function attachAdminEvents() {
  ensureModalOverlays();

  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.adminTab));
  });

  document.querySelectorAll("[data-admin-tab-btn]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.adminTabBtn));
  });

  document.querySelector("[data-admin-refresh]")?.addEventListener("click", () => {
    loadTabData(adminState.activeTab);
    showToast("Refreshed", "Dashboard data has been reloaded.");
  });

  document.querySelector("[data-admin-products-search]")?.addEventListener("input", (e) => {
    adminState.productSearch = e.target.value;
    renderProductsTable();
  });

  document.querySelector("[data-admin-products-category]")?.addEventListener("change", (e) => {
    adminState.productCategory = e.target.value;
    renderProductsTable();
  });

  document.querySelector("[data-admin-orders-search]")?.addEventListener("input", (e) => {
    adminState.ordersSearch = e.target.value;
    renderOrdersTable();
  });

  document.querySelector("[data-admin-orders-status]")?.addEventListener("change", (e) => {
    adminState.ordersStatus = e.target.value;
    renderOrdersTable();
  });

  document.querySelector("[data-admin-users-search]")?.addEventListener("input", (e) => {
    adminState.usersSearch = e.target.value;
    renderUsersTable();
  });

  document.querySelector("[data-admin-users-role]")?.addEventListener("change", (e) => {
    adminState.usersRole = e.target.value;
    renderUsersTable();
  });

  document.querySelector("[data-admin-add-product]")?.addEventListener("click", () => openProductModal(null));

  document.getElementById("admin-product-form")?.addEventListener("submit", saveProduct);

  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-admin-edit-product]");
    if (editBtn) {
      const id = Number(editBtn.dataset.adminEditProduct);
      const product = adminState.products.find((p) => p.id === id);
      if (product) openProductModal(product);
    }

    const viewProductBtn = e.target.closest("[data-admin-view-product]");
    if (viewProductBtn) {
      const id = Number(viewProductBtn.dataset.adminViewProduct);
      window.open(`/product.html?id=${id}`, "_blank");
    }

    const deleteBtn = e.target.closest("[data-admin-delete-product]");
    if (deleteBtn) openDeleteConfirm(Number(deleteBtn.dataset.adminDeleteProduct));

    const viewOrderBtn = e.target.closest("[data-admin-view-order]");
    if (viewOrderBtn) openOrderDetail(Number(viewOrderBtn.dataset.adminViewOrder));

    const viewUserBtn = e.target.closest("[data-admin-view-user]");
    if (viewUserBtn) {
      showToast("User profile", "Full user profile view coming soon.");
    }

    if (e.target.closest("[data-admin-product-cancel]")) closeModal("admin-product-modal");
    if (e.target.closest("[data-admin-order-cancel]")) closeModal("admin-order-modal");
    if (e.target.closest("[data-admin-delete-cancel]")) { pendingDeleteId = null; closeModal("admin-delete-modal"); }
    if (e.target.closest("#admin-delete-confirm-btn")) confirmDelete();

    if (e.target.classList.contains("admin-modal-overlay")) {
      e.target.classList.remove("open");
      pendingDeleteId = null;
    }
  });

  document.addEventListener("change", (e) => {
    const statusSelect = e.target.closest("[data-admin-order-status]");
    if (statusSelect) {
      const orderId = Number(statusSelect.dataset.adminOrderStatus);
      changeOrderStatus(orderId, statusSelect.value);
    }
  });
}

/* ── Boot ── */

async function bootAdmin() {
  updateCartCount();
  renderCart();
  attachEvents();
  attachAdminEvents();

  try {
    await refreshSession();
  } catch (err) {
    showToast("Session error", err.message);
  }

  if (!state.currentUser || !state.currentUser.isAdmin) {
    window.location.href = "/";
    return;
  }

  try {
    await loadStats();
  } catch (err) {
    showToast("Dashboard error", err.message);
  }
}

document.addEventListener("DOMContentLoaded", bootAdmin);
