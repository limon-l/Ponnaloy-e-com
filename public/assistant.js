(function () {
  const welcomeMessage =
    "I can explain the store, compare products, and recommend the best option for your use case.";

  const conversationState = {
    lastTopic: null,
  };

  function createAssistantMarkup() {
    const shell = document.createElement("div");
    shell.className = "assistant-shell";
    shell.innerHTML = `
      <button class="assistant-launcher" type="button" data-assistant-open>
        <span class="assistant-launcher-dot"></span>
        AI Concierge
      </button>
      <section class="assistant-panel" data-assistant-panel aria-label="AI shopping assistant" aria-hidden="true">
        <header class="assistant-header">
          <div>
            <div class="assistant-eyebrow">Ponnaloy AI</div>
            <h3>Commerce Concierge</h3>
            <p>Product-aware, comparison-ready, and built to guide shopping decisions with clarity.</p>
            <div class="assistant-status-row">
              <span class="assistant-status-chip"><span class="assistant-status-dot"></span> Live catalog</span>
              <span class="assistant-status-chip">Comparison mode</span>
              <span class="assistant-status-chip">Fast replies</span>
            </div>
          </div>
          <button class="assistant-close" type="button" data-assistant-close aria-label="Close assistant">✕</button>
        </header>
        <div class="assistant-quick-actions">
          <button type="button" class="assistant-chip" data-assistant-prompt="Show me the best sellers">Best sellers</button>
          <button type="button" class="assistant-chip" data-assistant-prompt="Compare Aurora Headphones and Halo Smartwatch">Compare two products</button>
          <button type="button" class="assistant-chip" data-assistant-prompt="Recommend a premium product for work">Work pick</button>
          <button type="button" class="assistant-chip" data-assistant-prompt="What makes this store premium?">About the store</button>
        </div>
        <div class="assistant-messages" data-assistant-messages></div>
        <div class="assistant-summary" data-assistant-summary hidden></div>
        <div class="assistant-comparison" data-assistant-comparison hidden></div>
        <form class="assistant-form" data-assistant-form>
          <textarea data-assistant-input rows="3" placeholder="Ask about a product or say compare product A and product B"></textarea>
          <div class="assistant-form-actions">
            <span class="assistant-hint">Examples: compare, recommend, best seller, return policy</span>
            <button class="button" type="submit">Send</button>
          </div>
        </form>
      </section>
    `;
    return shell;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatCompactPrice(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatToneLabel(tone) {
    switch (tone) {
      case "comparison":
        return "Comparison";
      case "recommendation":
        return "Recommendation";
      case "product":
        return "Product match";
      case "platform":
        return "Store overview";
      default:
        return "Assistant";
    }
  }

  function renderProductSuggestion(product) {
    return `
      <a class="assistant-product" href="/product.html?id=${product.id}">
        <img src="${product.imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" />
        <div>
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.category)}</span>
        </div>
        <div class="assistant-product-meta">
          <strong>${formatPrice(product.price)}</strong>
          <span>${product.rating.toFixed(1)} ★</span>
        </div>
      </a>
    `;
  }

  function appendMessage(messagesNode, role, content) {
    const row = document.createElement("article");
    row.className = `assistant-message ${role}`;
    row.innerHTML = content;
    messagesNode.appendChild(row);
    messagesNode.scrollTop = messagesNode.scrollHeight;
    return row;
  }

  function renderSummary(summaryNode, response) {
    if (!summaryNode) return;

    const storeFacts = response.storeFacts || {};
    const highlights = response.highlights || [];
    const valuePicks = response.valuePicks || [];

    summaryNode.hidden = false;
    summaryNode.innerHTML = `
      <div class="assistant-summary-header">
        <span class="assistant-summary-label">${escapeHtml(formatToneLabel(response.tone))}</span>
        <strong>${escapeHtml(response.followUp || "Ask for a comparison or product recommendation.")}</strong>
      </div>
      <div class="assistant-summary-stats">
        <div><span>Products</span><strong>${escapeHtml(storeFacts.productCount ?? "500+")}</strong></div>
        <div><span>Categories</span><strong>${escapeHtml(storeFacts.categoryCount ?? "10")}</strong></div>
        <div><span>Focus</span><strong>${escapeHtml(response.focusCategory || (storeFacts.categories || ["Curated"])[0] || "Curated")}</strong></div>
      </div>
      <div class="assistant-summary-block">
        <span>Highlights</span>
        <div class="assistant-inline-pills">
          ${highlights
            .map(
              (product) => `
                <a class="assistant-pill" href="/product.html?id=${product.id}">
                  ${escapeHtml(product.name)} · ${formatCompactPrice(product.price)}
                </a>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="assistant-summary-block">
        <span>Value picks</span>
        <div class="assistant-inline-pills secondary">
          ${valuePicks
            .map(
              (product) => `
                <a class="assistant-pill" href="/product.html?id=${product.id}">
                  ${escapeHtml(product.name)} · ${product.rating.toFixed(1)}★
                </a>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderStructuredReply(messagesNode, response) {
    const messageClass =
      response.tone === "comparison" ? "assistant comparison" : "assistant";
    const row = appendMessage(
      messagesNode,
      messageClass,
      `
        <div class="assistant-response-head">
          <span>${escapeHtml(formatToneLabel(response.tone))}</span>
          <strong>${escapeHtml(response.reply)}</strong>
        </div>
        ${response.followUp ? `<p class="assistant-follow-up">${escapeHtml(response.followUp)}</p>` : ""}
      `,
    );
    return row;
  }

  async function sendPrompt(panel, prompt, inputNode) {
    const messagesNode = panel.querySelector("[data-assistant-messages]");
    const comparisonNode = panel.querySelector("[data-assistant-comparison]");
    const summaryNode = panel.querySelector("[data-assistant-summary]");
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) return;

    conversationState.lastTopic = normalizedPrompt;

    appendMessage(
      messagesNode,
      "user",
      `<p>${escapeHtml(normalizedPrompt)}</p>`,
    );

    const loadingMessage = appendMessage(
      messagesNode,
      "assistant",
      `<p>Analyzing the catalog and preparing a concise answer...</p>`,
    );

    try {
      const response = await api("/chat", {
        method: "POST",
        body: JSON.stringify({ message: normalizedPrompt }),
      });

      loadingMessage.remove();
      renderStructuredReply(messagesNode, response);
      renderSummary(summaryNode, response);

      if (response.comparison && Array.isArray(response.comparison.points)) {
        comparisonNode.hidden = false;
        comparisonNode.innerHTML = `
          <strong>Product comparison</strong>
          <p>${escapeHtml(response.comparison.summary)}</p>
          <ul>
            ${response.comparison.points
              .map((point) => `<li>${escapeHtml(point)}</li>`)
              .join("")}
          </ul>
        `;
      } else {
        comparisonNode.hidden = true;
        comparisonNode.innerHTML = "";
      }

      if (Array.isArray(response.matches) && response.matches.length > 0) {
        appendMessage(
          messagesNode,
          "assistant products",
          `
            <div class="assistant-product-list">
              ${response.matches.map((product) => renderProductSuggestion(product)).join("")}
            </div>
          `,
        );
      }

      if (inputNode) {
        inputNode.value = "";
      }
    } catch (error) {
      loadingMessage.remove();
      appendMessage(
        messagesNode,
        "assistant",
        `<p>${escapeHtml(error.message || "The assistant could not answer right now.")}</p>`,
      );
      if (window.showToast) {
        showToast(
          "Assistant error",
          error.message || "Unable to reach the concierge.",
        );
      }
    }
  }

  function mountAssistant() {
    if (document.querySelector("[data-assistant-panel]")) return;

    const shell = createAssistantMarkup();
    document.body.appendChild(shell);

    const panel = shell.querySelector("[data-assistant-panel]");
    const messagesNode = shell.querySelector("[data-assistant-messages]");
    const summaryNode = shell.querySelector("[data-assistant-summary]");
    const inputNode = shell.querySelector("[data-assistant-input]");
    const openButton = shell.querySelector("[data-assistant-open]");
    const closeButton = shell.querySelector("[data-assistant-close]");
    const form = shell.querySelector("[data-assistant-form]");

    appendMessage(
      messagesNode,
      "assistant",
      `
        <div class="assistant-response-head">
          <span>Assistant ready</span>
          <strong>${escapeHtml(welcomeMessage)}</strong>
        </div>
      `,
    );

    if (summaryNode) {
      summaryNode.hidden = false;
      summaryNode.innerHTML = `
        <div class="assistant-summary-header">
          <span class="assistant-summary-label">Store knowledge</span>
          <strong>I know the catalog, the checkout flow, account access, and product comparisons.</strong>
        </div>
        <div class="assistant-summary-stats">
          <div><span>Mode</span><strong>Concierge</strong></div>
          <div><span>Depth</span><strong>Catalog-aware</strong></div>
          <div><span>Style</span><strong>Professional</strong></div>
        </div>
      `;
    }

    openButton.addEventListener("click", () => {
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      inputNode.focus();
    });

    closeButton.addEventListener("click", () => {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
    });

    shell.querySelectorAll("[data-assistant-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        panel.classList.add("open");
        panel.setAttribute("aria-hidden", "false");
        sendPrompt(panel, button.dataset.assistantPrompt, inputNode);
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendPrompt(panel, inputNode.value, inputNode);
    });
  }

  document.addEventListener("DOMContentLoaded", mountAssistant);
  window.PonnaloyAssistant = {
    open() {
      const panel = document.querySelector("[data-assistant-panel]");
      const inputNode = document.querySelector("[data-assistant-input]");
      if (!panel || !inputNode) return;
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      inputNode.focus();
    },
  };
})();
