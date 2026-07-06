let catalogState = {
  products: [],
  search: "",
  category: "all",
  sort: "featured",
};

function getUniqueCategories(products) {
  return ["all", ...new Set(products.map((product) => product.category))];
}

function sortProducts(products) {
  const sorted = [...products];
  switch (catalogState.sort) {
    case "price-asc":
      return sorted.sort((left, right) => left.price - right.price);
    case "price-desc":
      return sorted.sort((left, right) => right.price - left.price);
    case "rating":
      return sorted.sort((left, right) => right.rating - left.rating);
    default:
      return sorted.sort((left, right) => Number(right.featured) - Number(left.featured) || right.rating - left.rating);
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

  const filtered = filterProducts();
  if (countNode) {
    countNode.textContent = `${filtered.length.toLocaleString("en-US")} products`;
  }

  if (summaryNode) {
    const activeCategory = catalogState.category === "all" ? "all categories" : catalogState.category;
    summaryNode.textContent = `Browsing ${activeCategory} with live search and professional sorting.`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="catalog-empty reveal" style="grid-column: 1 / -1;">
        <h3>No products match your search</h3>
        <p>Try a broader search term or switch back to all categories.</p>
      </div>
    `;
    wireRevealAnimations(grid);
    return;
  }

  grid.innerHTML = filtered.map((product) => createProductCard(product)).join("");
  wireRevealAnimations(grid);
}

function renderCategoryFilters(categories) {
  const filtersNode = document.querySelector("[data-catalog-filters]");
  if (!filtersNode) return;

  filtersNode.innerHTML = categories
    .map(
      (category) => `
        <button class="filter-chip ${category === "all" ? "active" : ""}" type="button" data-catalog-filter="${category}">
          ${category === "all" ? "All" : category}
        </button>
      `,
    )
    .join("");

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

function attachCatalogEvents() {
  const searchNode = document.querySelector("[data-catalog-search]");
  const sortNode = document.querySelector("[data-catalog-sort]");

  searchNode?.addEventListener("input", (event) => {
    catalogState.search = event.target.value;
    renderCatalog();
  });

  sortNode?.addEventListener("change", (event) => {
    catalogState.sort = event.target.value;
    renderCatalog();
  });

  document.addEventListener("click", (event) => {
    const authToggle = event.target.closest("[data-auth-toggle]");
    if (authToggle) {
      if (window.state?.currentUser) {
        api("/logout", { method: "POST" })
          .then(() => {
            window.state.currentUser = null;
            renderHeaderAccount?.();
            showToast("Signed out", "Your session has been cleared.");
          })
          .catch((error) => showToast("Logout failed", error.message));
      } else {
        document.querySelector("[data-auth-modal]")?.classList.add("open");
      }
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
  } catch (error) {
    showToast("Catalog error", error.message);
  }

  attachCatalogEvents();
  renderCart();
  syncCheckoutForm();
}

document.addEventListener("DOMContentLoaded", bootCatalogPage);
