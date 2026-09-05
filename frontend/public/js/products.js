let catalogState = { products: [], search: "", category: "all", sort: "featured" };

function getUniqueCategories(products) {
  return ["all", ...new Set(products.map((product) => product.category))];
}

function sortProducts(products) {
  const sorted = [...products];
  switch (catalogState.sort) {
    case "price-asc": return sorted.sort((left, right) => left.price - right.price);
    case "price-desc": return sorted.sort((left, right) => right.price - left.price);
    case "rating": return sorted.sort((left, right) => right.rating - left.rating);
    default: return sorted.sort((left, right) => Number(right.featured) - Number(left.featured) || right.rating - left.rating);
  }
}

function filterProducts() {
  const query = catalogState.search.trim().toLowerCase();
  const filtered = catalogState.products.filter((product) => {
    const matchesCategory = catalogState.category === "all" || product.category === catalogState.category;
    const haystack = `${product.name} ${product.category} ${product.description} ${product.badge}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesCategory && matchesSearch;
  });
  return sortProducts(filtered);
}

function renderCatalog() {
  const grid = document.querySelector("[data-catalog-grid]");
  const countNode = document.querySelector("[data-catalog-count]");
  const summaryNode = document.querySelector("[data-catalog-summary]");
  if (!grid) return;
  removeSkeletons(grid);
  const filtered = filterProducts();
  if (countNode) countNode.textContent = `${filtered.length.toLocaleString("en-US")} products`;
  if (summaryNode) {
    const activeCategory = catalogState.category === "all" ? "all categories" : catalogState.category;
    summaryNode.textContent = `Browsing ${activeCategory} with live search and professional sorting.`;
  }
  if (!filtered.length) {
    grid.innerHTML = `<div class="catalog-empty reveal" style="grid-column: 1 / -1;"><h3>No products match your search</h3><p>Try a broader search term or switch back to all categories.</p></div>`;
    wireRevealAnimations(grid);
    return;
  }
  grid.innerHTML = filtered.map((product) => createProductCard(product)).join("");
  wireRevealAnimations(grid);
}

function renderCategoryFilters(categories) {
  const filtersNode = document.querySelector("[data-catalog-filters]");
  if (!filtersNode) return;
  filtersNode.innerHTML = categories.map((category) => `
    <button class="filter-chip ${category === "all" ? "active" : ""}" type="button" data-catalog-filter="${category}">
      ${category === "all" ? "All" : category}
    </button>
  `).join("");

  filtersNode.querySelectorAll("[data-catalog-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      catalogState.category = button.dataset.catalogFilter;
      document.querySelectorAll("[data-catalog-filter]").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.catalogFilter === catalogState.category);
      });
      renderCatalog();
    });
  });
}

async function loadCatalog() {
  const response = await api("/products");
  catalogState.products = response.products;
  const categories = getUniqueCategories(catalogState.products);
  renderCategoryFilters(categories);
  renderCatalog();
}

function renderSearchSuggestions(query, products) {
  const container = document.querySelector("[data-search-suggestions]");
  if (!container) return;
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) { container.style.display = "none"; container.innerHTML = ""; return; }

  const matches = products
    .filter((p) => {
      const haystack = `${p.name} ${p.category} ${p.description}`.toLowerCase();
      return haystack.includes(trimmed);
    })
    .slice(0, 6);

  if (!matches.length) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.innerHTML = matches.map((p) => `
    <a class="suggestion-item" href="/product.html?id=${p.id}">
      <img src="${p.imageUrl}" alt="" loading="lazy" width="40" height="40" />
      <div>
        <div class="suggestion-name">${p.name}</div>
        <div class="suggestion-meta">${p.category} · ${formatCurrency(p.price)}</div>
      </div>
    </a>
  `).join("");
  container.style.display = "block";
}

function hideSearchSuggestions() {
  const container = document.querySelector("[data-search-suggestions]");
  if (container) { container.style.display = "none"; }
}

function attachCatalogEvents() {
  const searchNode = document.querySelector("[data-catalog-search]");
  const sortNode = document.querySelector("[data-catalog-sort]");

  const debouncedSuggestions = debounce((value) => {
    renderSearchSuggestions(value, catalogState.products);
  }, 200);

  searchNode?.addEventListener("input", (event) => {
    catalogState.search = event.target.value;
    renderCatalog();
    debouncedSuggestions(event.target.value);
  });

  searchNode?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSearchSuggestions();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-catalog-search]") && !event.target.closest("[data-search-suggestions]")) {
      hideSearchSuggestions();
    }
  });

  sortNode?.addEventListener("change", (event) => { catalogState.sort = event.target.value; renderCatalog(); });

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-cart]");
    if (addButton) {
      const product = catalogState.products.find((entry) => entry.id === Number(addButton.dataset.addCart));
      if (product) { addToCart(product, 1); renderCart(); animateAddToCart(addButton); showToast("Added to cart", `${product.name} is ready in your cart.`); }
    }

    const wishlistBtn = event.target.closest("[data-wishlist-toggle]");
    if (wishlistBtn) {
      const id = Number(wishlistBtn.dataset.wishlistToggle);
      const nowIn = toggleWishlist(id);
      showToast(nowIn.includes(id) ? "Added to wishlist" : "Removed from wishlist", nowIn.includes(id) ? "Saved to your wishlist." : "Removed from your wishlist.");
    }
  });
}

async function bootCatalogPage() {
  updateCartCount();
  renderCart();
  attachEvents();
  setAuthTab("login");
  wireRevealAnimations();
  document.querySelector("[data-catalog-search]")?.focus();

  try {
    await Promise.all([refreshSession(), loadCatalog()]);
  } catch (error) { showToast("Catalog error", error.message); }

  attachCatalogEvents();
  renderCart();
  syncCheckoutForm();
}

document.addEventListener("DOMContentLoaded", bootCatalogPage);
