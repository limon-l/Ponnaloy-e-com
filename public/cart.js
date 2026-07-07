function getCart() {
  try { return JSON.parse(localStorage.getItem("ponnaloy-cart") || "[]"); } catch (error) { return []; }
}

function setCart(items) {
  localStorage.setItem("ponnaloy-cart", JSON.stringify(items));
  updateCartCount();
}

function clearCart() { setCart([]); }

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, category: product.category, quantity, stock: product.stock });
  }
  setCart(cart);
  return cart;
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart().map((item) => (item.id === productId ? { ...item, quantity } : item)).filter((item) => item.quantity > 0);
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
  document.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = String(count); });
}

function moneySum(items) { return items.reduce((total, item) => total + item.price * item.quantity, 0); }
function moneySubtotal(cart) { return moneySum(cart); }
function shippingFee(subtotal) { return subtotal > 150 ? 0 : 15; }
function orderTotal(cart) { const subtotal = moneySubtotal(cart); return subtotal + shippingFee(subtotal); }

const PROMO_CODES = {
  WELCOME10: { type: "percent", value: 10, label: "10% off" },
  FREESHIP: { type: "freeshipping", value: 0, label: "Free shipping" },
  VIP20: { type: "percent", value: 20, label: "VIP 20% off" },
};

function calcDiscount(subtotal) {
  if (!state.promoApplied) return 0;
  if (state.promoApplied.type === "percent") return subtotal * (state.promoApplied.value / 100);
  return 0;
}

function calcTax(amount) { return amount * 0.08; }

function renderCart() {
  const cartItems = document.querySelector("[data-cart-items]");
  const subtotalNode = document.querySelector("[data-cart-subtotal]");
  const shippingNode = document.querySelector("[data-cart-shipping]");
  const discountNode = document.querySelector("[data-cart-discount]");
  const discountRow = document.querySelector("[data-discount-row]");
  const taxNode = document.querySelector("[data-cart-tax]");
  const totalNode = document.querySelector("[data-cart-total]");
  if (!cartItems || !subtotalNode || !shippingNode || !taxNode || !totalNode) return;

  const cart = getCart();
  const subtotal = moneySubtotal(cart);
  const discount = calcDiscount(subtotal);
  const afterDiscount = subtotal - discount;
  const shipping = shippingFee(afterDiscount);
  const tax = calcTax(afterDiscount);
  const total = afterDiscount + shipping + tax;

  subtotalNode.textContent = formatCurrencyPrecise(subtotal);
  shippingNode.textContent = shipping === 0 ? "FREE" : formatCurrencyPrecise(shipping);
  taxNode.textContent = formatCurrencyPrecise(tax);
  totalNode.textContent = formatCurrencyPrecise(total);

  if (discountRow && discountNode) {
    discountRow.hidden = !state.promoApplied;
    if (state.promoApplied) discountNode.textContent = `-${formatCurrencyPrecise(discount)}`;
  }

  const placeBtn = document.querySelector("[data-place-order]");
  const clearBtn = document.querySelector("[data-clear-cart]");

  if (!cart.length) {
    cartItems.innerHTML = `<div class="empty-card"><h3>Your cart is empty</h3><p class="section-copy">Add products from the catalog to start building your order.</p></div>`;
    if (placeBtn) placeBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;
    return;
  }

  if (placeBtn) placeBtn.disabled = false;
  if (clearBtn) clearBtn.disabled = false;

  cartItems.innerHTML = cart.map((item) => `
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
  `).join("");
}

function applyPromoCode() {
  const input = document.querySelector("[data-promo-input]");
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) {
    input.classList.add("is-invalid");
    setTimeout(() => input.classList.remove("is-invalid"), 600);
    showToast("Enter a code", "Type a promo code to apply.");
    return;
  }
  const promo = PROMO_CODES[code];
  if (!promo) {
    state.promoApplied = null;
    input.classList.add("is-invalid");
    setTimeout(() => input.classList.remove("is-invalid"), 600);
    showToast("Invalid code", "That promo code was not recognized.");
    renderCart();
    return;
  }
  state.promoApplied = { code, ...promo };
  input.value = "";
  renderCart();
  showToast("Promo applied", promo.label);
}

async function submitOrderFromCart() {
  const cart = getCart();
  if (!cart.length) { showToast("Cart is empty", "Add at least one product before placing your order."); return; }
  if (!state.currentUser) { openAuthModal("login"); showToast("Login required", "Sign in to place your order."); return; }

  try {
    const response = await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
        customerName: state.currentUser.name || "",
        email: state.currentUser.email || "",
        paymentMethod: state.paymentMethod,
        promoCode: state.promoApplied?.code || null,
      }),
    });
    clearCart();
    state.promoApplied = null;
    renderCart();
    closeCart();
    fireConfetti();
    showToast("Order placed", `Order #${response.order.id} confirmed. Thank you!`);
  } catch (error) { showToast("Order failed", error.message); }
}

function openCart() {
  const drawer = document.querySelector("[data-cart-drawer]");
  drawer?.classList.add("open");
  document.body.classList.add("cart-open");
}

function closeCart() {
  const drawer = document.querySelector("[data-cart-drawer]");
  drawer?.classList.remove("open");
  document.body.classList.remove("cart-open");
  state.promoApplied = null;
}
