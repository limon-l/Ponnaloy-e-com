(function () {
  const welcomeMessage =
    "Ask me about any product, compare two items, or get a quick tour of the store.";

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
            <h3>Shopping Concierge</h3>
            <p>Compare products, explore the catalog, and get a guided recommendation.</p>
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

  async function sendPrompt(panel, prompt, inputNode) {
    const messagesNode = panel.querySelector("[data-assistant-messages]");
    const comparisonNode = panel.querySelector("[data-assistant-comparison]");
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) return;

    appendMessage(
      messagesNode,
      "user",
      `<p>${escapeHtml(normalizedPrompt)}</p>`,
    );

    const loadingMessage = appendMessage(
      messagesNode,
      "assistant",
      `<p>Thinking through the catalog...</p>`,
    );

    try {
      const response = await api("/chat", {
        method: "POST",
        body: JSON.stringify({ message: normalizedPrompt }),
      });

      loadingMessage.remove();
      appendMessage(
        messagesNode,
        "assistant",
        `<p>${escapeHtml(response.reply)}</p>`,
      );

      if (response.comparison && Array.isArray(response.comparison.points)) {
        comparisonNode.hidden = false;
        comparisonNode.innerHTML = `
          <strong>Comparison summary</strong>
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
        showToast("Assistant error", error.message || "Unable to reach the concierge.");
      }
    }
  }

  function mountAssistant() {
    if (document.querySelector("[data-assistant-panel]")) return;

    const shell = createAssistantMarkup();
    document.body.appendChild(shell);

    const panel = shell.querySelector("[data-assistant-panel]");
    const messagesNode = shell.querySelector("[data-assistant-messages]");
    const inputNode = shell.querySelector("[data-assistant-input]");
    const openButton = shell.querySelector("[data-assistant-open]");
    const closeButton = shell.querySelector("[data-assistant-close]");
    const form = shell.querySelector("[data-assistant-form]");

    appendMessage(
      messagesNode,
      "assistant",
      `<p>${escapeHtml(welcomeMessage)}</p>`,
    );

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
