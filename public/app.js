let state = {
  products: [],
  filteredProducts: [],
  category: "all",
  search: "",
  currentUser: null,
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

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-card reveal" style="grid-column: 1 / -1;">
        <h3>No products match your search</h3>
        <p class="section-copy">Try a different keyword or choose another category.</p>
      </div>
    `;
    wireRevealAnimations(grid);
    return;
  }

  grid.innerHTML = products
    .map((product) => createProductCard(product))
    .join("");
  wireRevealAnimations(grid);
}

function applyFilters() {
  const query = state.search.trim().toLowerCase();
  state.filteredProducts = state.products.filter((product) => {
    const matchesCategory =
      state.category === "all" || product.category === state.category;
    const haystack =
      `${product.name} ${product.category} ${product.description}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesCategory && matchesSearch;
  });
  renderProductGrid(state.filteredProducts);
}

function renderCart() {
  const cartItems = document.querySelector("[data-cart-items]");
  const subtotalNode = document.querySelector("[data-cart-subtotal]");
  const shippingNode = document.querySelector("[data-cart-shipping]");
  const totalNode = document.querySelector("[data-cart-total]");
  if (!cartItems || !subtotalNode || !shippingNode || !totalNode) return;

  const cart = getCart();
  const subtotal = moneySubtotal(cart);
  const shipping = shippingFee(subtotal);
  const total = subtotal + shipping;

  subtotalNode.textContent = formatCurrencyPrecise(subtotal);
  shippingNode.textContent = formatCurrencyPrecise(shipping);
  totalNode.textContent = formatCurrencyPrecise(total);

  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="empty-card">
        <h3>Your cart is empty</h3>
        <p class="section-copy">Add products from the catalog to start building your order.</p>
      </div>
    `;
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <article class="cart-item">
          <img src="${item.imageUrl}" alt="${item.name}" />
          <div>
            <h4>${item.name}</h4>
            <p>${item.category}</p>
            <div class="cart-row" style="margin-top: 10px;">
              <strong>${formatCurrencyPrecise(item.price)}</strong>
              <strong>${formatCurrencyPrecise(item.price * item.quantity)}</strong>
            </div>
            <div class="controls">
              <button class="mini-button" data-qty-minus="${item.id}" aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button class="mini-button" data-qty-plus="${item.id}" aria-label="Increase quantity">+</button>
              <button class="button-ghost" data-remove-item="${item.id}">Remove</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function syncCheckoutForm() {
  const form = document.querySelector("[data-checkout-form]");
  if (!form || !state.currentUser) return;

  const nameField = form.querySelector('[name="customerName"]');
  const emailField = form.querySelector('[name="email"]');
  if (nameField && !nameField.value) nameField.value = state.currentUser.name;
  if (emailField && !emailField.value)
    emailField.value = state.currentUser.email;
}

function openCart() {
  const drawer = document.querySelector("[data-cart-drawer]");
  drawer?.classList.add("open");
}

function closeCart() {
  const drawer = document.querySelector("[data-cart-drawer]");
  drawer?.classList.remove("open");
}

function openAuthModal(tab = "login") {
  const modal = document.querySelector("[data-auth-modal]");
  if (!modal) return;
  modal.classList.add("open");
  setAuthTab(tab);
}

function closeAuthModal() {
  const modal = document.querySelector("[data-auth-modal]");
  modal?.classList.remove("open");
}

function setAuthTab(tab) {
  const loginForm = document.querySelector("[data-login-form]");
  const registerForm = document.querySelector("[data-register-form]");
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === tab);
  });
  if (loginForm && registerForm) {
    loginForm.hidden = tab !== "login";
    registerForm.hidden = tab !== "register";
  }
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

    const authToggle = event.target.closest("[data-auth-toggle]");
    if (authToggle) {
      if (state.currentUser) {
        api("/logout", { method: "POST" })
          .then(async () => {
            state.currentUser = null;
            renderHeaderAccount();
            syncCheckoutForm();
            showToast("Signed out", "Your session has been cleared.");
          })
          .catch((error) => showToast("Logout failed", error.message));
      } else {
        openAuthModal("login");
      }
    }

    const cartOpen = event.target.closest("[data-cart-open]");
    if (cartOpen) openCart();

    const cartClose = event.target.closest("[data-cart-close]");
    if (cartClose) closeCart();

    const tabButton = event.target.closest("[data-auth-tab]");
    if (tabButton) setAuthTab(tabButton.dataset.authTab);

    const removeItem = event.target.closest("[data-remove-item]");
    if (removeItem) {
      removeFromCart(Number(removeItem.dataset.removeItem));
      renderCart();
    }

    const qtyMinus = event.target.closest("[data-qty-minus]");
    if (qtyMinus) {
      const cart = getCart();
      const item = cart.find(
        (entry) => entry.id === Number(qtyMinus.dataset.qtyMinus),
      );
      if (item) {
        updateCartQuantity(item.id, item.quantity - 1);
        renderCart();
      }
    }

    const qtyPlus = event.target.closest("[data-qty-plus]");
    if (qtyPlus) {
      const cart = getCart();
      const item = cart.find(
        (entry) => entry.id === Number(qtyPlus.dataset.qtyPlus),
      );
      if (item) {
        updateCartQuantity(item.id, item.quantity + 1);
        renderCart();
      }
    }

    const startCheckout = event.target.closest("[data-start-checkout]");
    if (startCheckout) {
      closeCart();
      if (!state.currentUser) {
        openAuthModal("login");
        showToast(
          "Login required",
          "Create an account or sign in to place your order.",
        );
      }
    }

    const clearCartButton = event.target.closest("[data-clear-cart]");
    if (clearCartButton) {
      clearCart();
      renderCart();
      showToast("Cart cleared", "All items were removed from your cart.");
    }
  });

  document
    .querySelector("[data-login-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      try {
        await api("/login", {
          method: "POST",
          body: JSON.stringify({
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });
        await refreshSession();
        closeAuthModal();
        showToast("Welcome back", "You are now signed in.");
        event.currentTarget.reset();
      } catch (error) {
        showToast("Login failed", error.message);
      }
    });

  document
    .querySelector("[data-register-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      try {
        await api("/register", {
          method: "POST",
          body: JSON.stringify({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });
        await refreshSession();
        closeAuthModal();
        showToast("Account created", "Your account is ready for checkout.");
        event.currentTarget.reset();
      } catch (error) {
        showToast("Registration failed", error.message);
      }
    });

  document
    .querySelector("[data-checkout-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.currentUser) {
        openAuthModal("login");
        showToast("Login required", "Please sign in before placing an order.");
        return;
      }

      const cart = getCart();
      if (!cart.length) {
        showToast("Cart is empty", "Add at least one product before checkout.");
        return;
      }

      const formData = new FormData(event.currentTarget);
      try {
        const response = await api("/orders", {
          method: "POST",
          body: JSON.stringify({
            items: cart.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
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
        showToast(
          "Order placed",
          `Order #${response.order.id} has been created successfully.`,
        );
      } catch (error) {
        showToast("Checkout failed", error.message);
      }
    });

  document
    .querySelector("[data-auth-close]")
    ?.addEventListener("click", closeAuthModal);
  document
    .querySelector("[data-auth-modal]")
    ?.addEventListener("click", (event) => {
      if (event.target.matches("[data-auth-modal]")) {
        closeAuthModal();
      }
    });

  document
    .querySelector("[data-cart-drawer]")
    ?.addEventListener("click", (event) => {
      if (event.target.matches("[data-cart-drawer]")) {
        closeCart();
      }
    });
}

async function boot() {
  updateCartCount();
  renderCart();
  attachEvents();
  setAuthTab("login");
  setActiveFilterButtons("all");
  wireRevealAnimations();

  try {
    await Promise.all([refreshSession(), loadProducts()]);
  } catch (error) {
    showToast("Startup error", error.message);
  }

  renderCart();
  syncCheckoutForm();
}

document.addEventListener("DOMContentLoaded", boot);
