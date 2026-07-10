let state = {
  products: [],
  filteredProducts: [],
  category: "all",
  search: "",
  currentUser: null,
  promoApplied: null,
  paymentMethod: "card",
};

function renderHeaderAccount() {
  const button = document.querySelector("[data-auth-toggle]");
  if (!button) return;
  if (state.currentUser) {
    button.textContent = `Sign out`;
    button.title = `Signed in as ${state.currentUser.name}`;
  } else {
    button.textContent = "Sign in";
    button.title = "Open account modal";
  }
}

function renderProductGrid(products) {
  const grid = document.querySelector("[data-product-grid]");
  if (!grid) return;
  removeSkeletons(grid);
  if (!products.length) {
    grid.innerHTML = `<div class="empty-card reveal" style="grid-column: 1 / -1;"><h3>No products match your search</h3><p class="section-copy">Try a different keyword or choose another category.</p></div>`;
    wireRevealAnimations(grid);
    return;
  }
  grid.innerHTML = products.map((product) => createProductCard(product)).join("");
  wireRevealAnimations(grid);
}

function applyFilters() {
  const query = state.search.trim().toLowerCase();
  state.filteredProducts = state.products.filter((product) => {
    const matchesCategory = state.category === "all" || product.category === state.category;
    const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesCategory && matchesSearch;
  });
  renderProductGrid(state.filteredProducts);
}

function syncCheckoutForm() {
  const form = document.querySelector("[data-checkout-form]");
  if (!form || !state.currentUser) return;
  const nameField = form.querySelector('[name="customerName"]');
  const emailField = form.querySelector('[name="email"]');
  if (nameField && !nameField.value) nameField.value = state.currentUser.name;
  if (emailField && !emailField.value) emailField.value = state.currentUser.email;
}

async function refreshSession() {
  const response = await api("/me");
  state.currentUser = response.user;
  renderHeaderAccount();
  syncCheckoutForm();
}

async function loadProducts() {
  const response = await api("/products?featured=true");
  state.products = response.products;
  applyFilters();
}

function attachEvents() {
  if (window.__ponnaloyEventsAttached) return;
  window.__ponnaloyEventsAttached = true;
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const promoInput = event.target.closest("[data-promo-input]");
      if (promoInput) { event.preventDefault(); applyPromoCode(); }
    }
  });

  const searchInput = document.querySelector("[data-product-search]");
  searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value;
    applyFilters();
  });

  document.querySelectorAll("[data-category-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.categoryFilter;
      setActiveFilterButtons(state.category);
      applyFilters();
    });
  });

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-cart]");
    if (addButton && event.target.closest("[data-product-grid]")) {
      const productId = Number(addButton.dataset.addCart);
      const product = state.products.find((item) => item.id === productId);
      if (product) {
        addToCart(product, 1);
        renderCart();
        showToast("Added to cart", `${product.name} is ready in your cart.`);
      }
    }

    const wishlistBtn = event.target.closest("[data-wishlist-toggle]");
    if (wishlistBtn) {
      const id = Number(wishlistBtn.dataset.wishlistToggle);
      const nowIn = toggleWishlist(id);
      showToast(nowIn.includes(id) ? "Added to wishlist" : "Removed from wishlist", nowIn.includes(id) ? "Saved to your wishlist." : "Removed from your wishlist.");
    }

    const authToggle = event.target.closest("[data-auth-toggle]");
    if (authToggle) {
      if (state.currentUser) {
        api("/logout", { method: "POST" }).then(async () => {
          state.currentUser = null;
          renderHeaderAccount();
          syncCheckoutForm();
          showToast("Signed out", "Your session has been cleared.");
        }).catch((error) => showToast("Logout failed", error.message));
      } else { openAuthModal("login"); }
    }

    const cartOpen = event.target.closest("[data-cart-open]");
    if (cartOpen) openCart();

    const cartClose = event.target.closest("[data-cart-close]");
    if (cartClose) closeCart();

    const removeItem = event.target.closest("[data-remove-item]");
    if (removeItem) { removeFromCart(Number(removeItem.dataset.removeItem)); renderCart(); }

    const qtyMinus = event.target.closest("[data-qty-minus]");
    if (qtyMinus) {
      const cart = getCart();
      const item = cart.find((entry) => entry.id === Number(qtyMinus.dataset.qtyMinus));
      if (item) { updateCartQuantity(item.id, item.quantity - 1); renderCart(); }
    }

    const qtyPlus = event.target.closest("[data-qty-plus]");
    if (qtyPlus) {
      const cart = getCart();
      const item = cart.find((entry) => entry.id === Number(qtyPlus.dataset.qtyPlus));
      if (item) { updateCartQuantity(item.id, item.quantity + 1); renderCart(); }
    }

    const clearCartButton = event.target.closest("[data-clear-cart]");
    if (clearCartButton) {
      clearCart();
      state.promoApplied = null;
      renderCart();
      showToast("Cart cleared", "All items were removed from your cart.");
    }

    const placeOrderButton = event.target.closest("[data-place-order]");
    if (placeOrderButton) { submitOrderFromCart(); }

    const promoApplyButton = event.target.closest("[data-promo-apply]");
    if (promoApplyButton) { applyPromoCode(); }

    const paymentRadio = event.target.closest(".payment-method input[type='radio']");
    if (paymentRadio) {
      state.paymentMethod = paymentRadio.value;
      document.querySelectorAll(".payment-method").forEach((el) => {
        el.classList.toggle("selected", el.querySelector("input")?.checked);
      });
    }
  });

  document.querySelector("[data-checkout-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser) { openAuthModal("login"); showToast("Login required", "Please sign in before placing an order."); return; }
    const cart = getCart();
    if (!cart.length) { showToast("Cart is empty", "Add at least one product before checkout."); return; }
    const formData = new FormData(event.currentTarget);
    try {
      const response = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
          customerName: formData.get("customerName"),
          shippingAddress: formData.get("shippingAddress"),
          phone: formData.get("phone"),
          email: formData.get("email"),
        }),
      });
      clearCart();
      renderCart();
      event.currentTarget.reset();
      syncCheckoutForm();
      fireConfetti();
      showToast("Order placed", `Order #${response.order.id} has been created successfully.`);
    } catch (error) { showToast("Checkout failed", error.message); }
  });

  document.querySelector("[data-cart-drawer]")?.addEventListener("click", (event) => {
    if (event.target.matches("[data-cart-drawer]")) { closeCart(); }
  });
}

async function loadDeals() {
    const grid = document.querySelector('[data-deals-grid]');
    if (!grid) return;
    try {
        const response = await api('/products?deals=true');
        removeSkeletons(grid);
        if (response.products.length) {
            grid.innerHTML = response.products.slice(0, 6).map(p => createProductCard(p)).join('');
            wireRevealAnimations(grid);
        }
    } catch (err) {
        removeSkeletons(grid);
    }
}

async function boot() {
  updateCartCount();
  renderCart();
  attachEvents();
  setActiveFilterButtons("all");
  wireRevealAnimations();

  try {
    await Promise.all([refreshSession(), loadProducts()]);
    loadDeals();
  } catch (error) {
    showToast("Startup error", error.message);
  }

  renderCart();
  syncCheckoutForm();
}

document.addEventListener("DOMContentLoaded", boot);
