let dashboardState = {
  user: null,
  orders: [],
  addresses: [],
  activeTab: "profile",
  editingAddressId: null,
};

function showDashboardSection(tab) {
  dashboardState.activeTab = tab;
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tab;
    panel.classList.toggle("active", isActive);
    if (isActive) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
  });
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  history.replaceState(null, "", `#${tab}`);
}

function renderProfile() {
  const user = dashboardState.user;
  if (!user) return;
  const nameEl = document.querySelector("[data-profile-name]");
  const emailEl = document.querySelector("[data-profile-email]");
  const phoneEl = document.querySelector("[data-profile-phone]");
  if (nameEl) nameEl.textContent = user.name || "";
  if (emailEl) emailEl.textContent = user.email || "";
  if (phoneEl) phoneEl.textContent = user.phone || "";

  const nameInput = document.querySelector("[data-profile-name-input]");
  const emailInput = document.querySelector("[data-profile-email-input]");
  const phoneInput = document.querySelector("[data-profile-phone-input]");
  if (nameInput) nameInput.value = user.name || "";
  if (emailInput) emailInput.value = user.email || "";
  if (phoneInput) phoneInput.value = user.phone || "";
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
}

function getStatusBadge(status) {
  const styles = {
    pending: "is-warning",
    confirmed: "is-info",
    processing: "is-info",
    shipped: "is-primary",
    delivered: "is-success",
    cancelled: "is-danger",
    refunded: "is-danger",
  };
  const cls = styles[status] || "is-warning";
  return `<span class="order-badge ${cls}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function renderDashboardOrders() {
  const container = document.querySelector("[data-orders-list]");
  if (!container) return;
  if (!dashboardState.orders.length) {
    container.innerHTML = `<div class="empty-card"><h3>No orders yet</h3><p class="section-copy">When you place an order, it will appear here.</p></div>`;
    return;
  }
  container.innerHTML = dashboardState.orders.map((order) => `
    <a class="order-card" href="/orders?id=${order.id}">
      <div class="order-card-top">
        <span class="order-id">#${order.id}</span>
        ${getStatusBadge(order.status)}
      </div>
      <div class="order-card-body">
        <span class="order-date">${new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
        <span class="order-total">${formatCurrency(order.total)}</span>
      </div>
      <div class="order-card-items">${(order.items || []).slice(0, 3).map((item) => `
        <span class="order-item-name">${item.name || item.productId}</span>
      `).join("")}${(order.items || []).length > 3 ? ` <span class="order-more">+${order.items.length - 3} more</span>` : ""}</div>
    </a>
  `).join("");
}

async function renderWishlist() {
  const container = document.querySelector("[data-wishlist-grid]");
  if (!container) return;
  const ids = getWishlist();
  if (!ids.length) {
    container.innerHTML = `<div class="empty-card"><h3>Your wishlist is empty</h3><p class="section-copy">Browse products and save your favorites here.</p></div>`;
    return;
  }
  try {
    const response = await api("/wishlist");
    const items = response.wishlist || response.products || response.items || response;
    const products = items.map(item => item.product || item);
    if (!products.length) {
      container.innerHTML = `<div class="empty-card"><h3>Your wishlist is empty</h3><p class="section-copy">Browse products and save your favorites here.</p></div>`;
      return;
    }
    container.innerHTML = products.map((product) => createProductCard(product)).join("");
  } catch (error) {
    container.innerHTML = `<div class="empty-card"><h3>Could not load wishlist</h3><p class="section-copy">${error.message}</p></div>`;
  }
}

function renderAddresses() {
  const container = document.querySelector("[data-addresses-grid]");
  if (!container) return;
  if (!dashboardState.addresses.length) {
    container.innerHTML = `<div class="empty-state" data-addresses-empty><div class="brand-mark"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span></div><h4>No saved addresses</h4><p>Add a shipping address to speed up your checkout.</p><button class="button" data-add-address>Add your first address</button></div>`;
    return;
  }
  container.innerHTML = dashboardState.addresses.map((addr) => `
    <article class="address-card${addr.is_default ? " is-default" : ""}" data-address-id="${addr.id}">
      ${addr.is_default ? `<span class="address-default-badge">Default</span>` : ""}
      <div class="address-card-body">
        <strong>${addr.label || "Address"}</strong>
        <p>${addr.address_line1 || ""}</p>
        <p>${addr.city || ""}, ${addr.state || ""} ${addr.zip_code || ""}</p>
        <p>${addr.full_name || ""}</p>
      </div>
      <div class="address-card-actions">
        <button class="button-ghost" data-address-edit="${addr.id}">Edit</button>
        <button class="button-ghost" data-address-delete="${addr.id}">Delete</button>
        ${!addr.is_default ? `<button class="button-ghost" data-address-default="${addr.id}">Set as default</button>` : ""}
      </div>
    </article>
  `).join("");
}

function openAddressModal(address = null) {
  dashboardState.editingAddressId = address ? address.id : null;
  const modal = document.querySelector("[data-address-modal]");
  if (!modal) return;
  const form = modal.querySelector("[data-address-form]");
  if (form) {
    form.querySelector('[name="label"]').value = address ? address.label || "" : "";
    form.querySelector('[name="street"]').value = address ? address.address_line1 || "" : "";
    form.querySelector('[name="city"]').value = address ? address.city || "" : "";
    form.querySelector('[name="state"]').value = address ? address.state || "" : "";
    form.querySelector('[name="zip"]').value = address ? address.zip_code || "" : "";
    form.querySelector('[name="country"]').value = address ? address.full_name || "" : "";
  }
  modal.classList.add("open");
}

function closeAddressModal() {
  const modal = document.querySelector("[data-address-modal]");
  if (!modal) return;
  modal.classList.remove("open");
  dashboardState.editingAddressId = null;
  const form = modal.querySelector("[data-address-form]");
  if (form) form.reset();
}

async function saveAddress(formData) {
  const body = {
    label: formData.get("label"),
    fullName: formData.get("country") || state.currentUser?.name || "",
    addressLine1: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state"),
    zipCode: formData.get("zip"),
  };
  try {
    if (dashboardState.editingAddressId) {
      await api(`/addresses/${dashboardState.editingAddressId}`, { method: "PUT", body: JSON.stringify(body) });
      showToast("Address updated", "Your address has been updated.");
    } else {
      if (dashboardState.addresses.length === 0) body.isDefault = true;
      const response = await api("/addresses", { method: "POST", body: JSON.stringify(body) });
      showToast("Address added", "Your new address has been saved.");
    }
    closeAddressModal();
    await loadAddresses();
    renderAddresses();
  } catch (error) {
    showToast("Address failed", error.message);
  }
}

async function deleteAddress(id) {
  try {
    await api(`/addresses/${id}`, { method: "DELETE" });
    dashboardState.addresses = dashboardState.addresses.filter((a) => a.id !== id);
    renderAddresses();
    showToast("Address deleted", "The address has been removed.");
  } catch (error) {
    showToast("Delete failed", error.message);
  }
}

async function setDefaultAddress(id) {
  try {
    await api(`/addresses/${id}`, { method: "PUT", body: JSON.stringify({ isDefault: true }) });
    await loadAddresses();
    renderAddresses();
    showToast("Default updated", "Default address has been changed.");
  } catch (error) {
    showToast("Update failed", error.message);
  }
}

async function loadDashboardOrders() {
  try {
    const response = await api("/orders");
    dashboardState.orders = response.orders || response;
  } catch (error) {
    dashboardState.orders = [];
  }
}

async function loadAddresses() {
  try {
    const response = await api("/addresses");
    dashboardState.addresses = response.addresses || response;
  } catch (error) {
    dashboardState.addresses = [];
  }
}

async function loadTabContent(tab) {
  switch (tab) {
    case "orders":
      await loadDashboardOrders();
      renderDashboardOrders();
      break;
    case "wishlist":
      await renderWishlist();
      break;
    case "addresses":
      await loadAddresses();
      renderAddresses();
      break;
  }
}

function attachDashboardEvents() {
  document.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-tab]");
    if (tabBtn) {
      const tab = tabBtn.dataset.tab;
      showDashboardSection(tab);
      loadTabContent(tab);
      return;
    }

    const tabTrigger = event.target.closest("[data-dashboard-tab-trigger]");
    if (tabTrigger) {
      const tab = tabTrigger.dataset.dashboardTabTrigger;
      showDashboardSection(tab);
      loadTabContent(tab);
      return;
    }

    const editBtn = event.target.closest("[data-address-edit]");
    if (editBtn) {
      const id = Number(editBtn.dataset.addressEdit);
      const address = dashboardState.addresses.find((a) => a.id === id);
      if (address) openAddressModal(address);
      return;
    }

    const deleteBtn = event.target.closest("[data-address-delete]");
    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.addressDelete);
      deleteAddress(id);
      return;
    }

    const defaultBtn = event.target.closest("[data-address-default]");
    if (defaultBtn) {
      const id = Number(defaultBtn.dataset.addressDefault);
      setDefaultAddress(id);
      return;
    }

    const addAddressBtn = event.target.closest("[data-address-add]");
    if (addAddressBtn) {
      openAddressModal();
      return;
    }

    const addressModalClose = event.target.closest("[data-address-modal-close]");
    if (addressModalClose) {
      closeAddressModal();
      return;
    }

    const addressModal = document.querySelector("[data-address-modal]");
    if (addressModal && event.target === addressModal) {
      closeAddressModal();
    }
  });

  document.querySelector("[data-profile-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const button = form.querySelector("button[type=submit]");
    if (button) button.disabled = true;
    try {
      const response = await api("/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
        }),
      });
      dashboardState.user = response.user || response;
      renderProfile();
      state.currentUser = dashboardState.user;
      renderHeaderAccount();
      showToast("Profile updated", "Your profile information has been saved.");
    } catch (error) {
      showToast("Update failed", error.message);
    } finally {
      if (button) button.disabled = false;
    }
  });

  document.querySelector("[data-password-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const button = form.querySelector("button[type=submit]");
    if (button) button.disabled = true;
    try {
      await api("/user/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword: formData.get("newPassword"),
        }),
      });
      form.reset();
      showToast("Password changed", "Your password has been updated successfully.");
    } catch (error) {
      showToast("Password failed", error.message);
    } finally {
      if (button) button.disabled = false;
    }
  });

  document.querySelector("[data-address-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const button = form.querySelector("button[type=submit]");
    if (button) button.disabled = true;
    await saveAddress(formData);
    if (button) button.disabled = false;
  });
}

async function loadDashboardStats() {
  try {
    const [ordersRes, wishlistRes, addressesRes] = await Promise.all([
      api("/orders").catch(() => ({ orders: [] })),
      api("/wishlist").catch(() => ({ wishlist: [] })),
      api("/addresses").catch(() => ({ addresses: [] })),
    ]);
    const orders = ordersRes.orders || [];
    const wishlist = wishlistRes.wishlist || [];
    const addresses = addressesRes.addresses || [];
    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    setText("[data-stat-orders]", orders.length);
    setText("[data-stat-wishlist]", wishlist.length);
    setText("[data-stat-addresses]", addresses.length);
    setText("[data-stat-spent]", formatCurrency(totalSpent));

    setText("[data-summary-status]", state.currentUser.isAdmin ? "Admin" : "Active member");
    setText("[data-summary-joined]", state.currentUser.createdAt ? new Date(state.currentUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—");
    setText("[data-summary-orders]", orders.length);
    setText("[data-summary-spent]", formatCurrency(totalSpent));
    setText("[data-summary-wishlist]", wishlist.length);
    setText("[data-summary-addresses]", addresses.length);

    const profileDisplayName = document.querySelector("[data-profile-display-name]");
    const profileDisplayEmail = document.querySelector("[data-profile-display-email]");
    const profileDisplayPhone = document.querySelector("[data-profile-display-phone]");
    if (profileDisplayName) profileDisplayName.textContent = state.currentUser.name || "—";
    if (profileDisplayEmail) profileDisplayEmail.textContent = state.currentUser.email || "—";
    if (profileDisplayPhone) profileDisplayPhone.textContent = state.currentUser.phone || "—";
  } catch (e) { /* stats are non-critical */ }
}

async function bootDashboard() {
  try {
    await refreshSession();
  } catch (error) {
    /* continue — show login prompt */
  }
  if (!state.currentUser) {
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `
        <section class="section xs:pt-10 lg:pt-16">
          <div class="container" style="max-width: 560px; margin: 0 auto; text-align: center;">
            <div class="brand-mark" style="margin: 0 auto 20px;">
              <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
            </div>
            <h1 class="glow-text" style="font-size: 1.6rem; margin-bottom: 12px;">Sign in to your dashboard</h1>
            <p class="section-copy">Manage your profile, track orders, curate your wishlist, and keep your addresses up to date.</p>
            <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button class="button" onclick="openAuthModal('login')">Sign in</button>
              <button class="button-secondary" onclick="openAuthModal('register')">Create account</button>
            </div>
          </div>
        </section>
      `;
    }
    return;
  }
  dashboardState.user = state.currentUser;
  const adminLink = document.querySelector("[data-admin-link]");
  if (adminLink) {
    adminLink.hidden = !dashboardState.user.isAdmin;
  }
  renderProfile();
  loadDashboardStats();
  attachDashboardEvents();
  const hash = location.hash.replace("#", "") || "profile";
  showDashboardSection(hash);
  loadTabContent(hash);
}

document.addEventListener("DOMContentLoaded", bootDashboard);
