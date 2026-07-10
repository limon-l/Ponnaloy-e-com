let dashboardState = {
  user: null,
  orders: [],
  addresses: [],
  activeTab: "profile",
  editingAddressId: null,
};

function showDashboardSection(tab) {
  dashboardState.activeTab = tab;
  document.querySelectorAll("[data-dashboard-section]").forEach((section) => {
    section.classList.toggle("active", section.dataset.dashboardSection === tab);
  });
  document.querySelectorAll("[data-dashboard-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.dashboardTab === tab);
    btn.setAttribute("aria-selected", btn.dataset.dashboardTab === tab ? "true" : "false");
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

function renderOrders() {
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
    const products = response.products || response.items || response;
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
  const container = document.querySelector("[data-addresses-list]");
  if (!container) return;
  if (!dashboardState.addresses.length) {
    container.innerHTML = `<div class="empty-card"><h3>No saved addresses</h3><p class="section-copy">Add a shipping address for faster checkout.</p></div>`;
    return;
  }
  container.innerHTML = dashboardState.addresses.map((addr) => `
    <article class="address-card${addr.isDefault ? " is-default" : ""}" data-address-id="${addr.id}">
      ${addr.isDefault ? `<span class="address-default-badge">Default</span>` : ""}
      <div class="address-card-body">
        <strong>${addr.label || "Address"}</strong>
        <p>${addr.street}</p>
        <p>${addr.city}, ${addr.state} ${addr.zip}</p>
        <p>${addr.country}</p>
      </div>
      <div class="address-card-actions">
        <button class="button-ghost" data-address-edit="${addr.id}">Edit</button>
        <button class="button-ghost" data-address-delete="${addr.id}">Delete</button>
        ${!addr.isDefault ? `<button class="button-ghost" data-address-default="${addr.id}">Set as default</button>` : ""}
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
    form.querySelector('[name="street"]').value = address ? address.street || "" : "";
    form.querySelector('[name="city"]').value = address ? address.city || "" : "";
    form.querySelector('[name="state"]').value = address ? address.state || "" : "";
    form.querySelector('[name="zip"]').value = address ? address.zip || "" : "";
    form.querySelector('[name="country"]').value = address ? address.country || "" : "";
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
    street: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    country: formData.get("country"),
  };
  try {
    if (dashboardState.editingAddressId) {
      await api(`/addresses/${dashboardState.editingAddressId}`, { method: "PUT", body: JSON.stringify(body) });
      showToast("Address updated", "Your address has been updated.");
    } else {
      const response = await api("/addresses", { method: "POST", body: JSON.stringify(body) });
      if (dashboardState.addresses.length === 0) body.isDefault = true;
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

async function loadOrders() {
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
      await loadOrders();
      renderOrders();
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
    const tabBtn = event.target.closest("[data-dashboard-tab]");
    if (tabBtn) {
      const tab = tabBtn.dataset.dashboardTab;
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

async function bootDashboard() {
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
  dashboardState.user = state.currentUser;
  const adminLink = document.querySelector("[data-admin-link]");
  if (adminLink) {
    adminLink.style.display = dashboardState.user.isAdmin ? "" : "none";
  }
  renderProfile();
  attachDashboardEvents();
  const hash = location.hash.replace("#", "") || "profile";
  showDashboardSection(hash);
  loadTabContent(hash);
}

document.addEventListener("DOMContentLoaded", bootDashboard);
