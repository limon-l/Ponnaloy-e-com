(function () {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function time() {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(value);
  }

  function createMarkup() {
    const shell = document.createElement("div");
    shell.className = "as-shell";
    shell.innerHTML = [
      '<button class="as-launcher" type="button" data-as-open>',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      "Assistant",
      "</button>",
      '<section class="as-panel" data-as-panel aria-label="Shopping assistant" aria-hidden="true">',
      '<header class="as-header">',
      '<div class="as-header-left">',
      '<span class="as-avatar as-avatar-bot"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>',
      "<div>",
      '<h3 class="as-title">Assistant</h3>',
      '<span class="as-status">Online</span>',
      "</div>",
      "</div>",
      '<button class="as-close" type="button" data-as-close aria-label="Close assistant">',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      "</button>",
      "</header>",
      '<div class="as-msgs" data-as-msgs></div>',
      '<div class="as-date-divider" data-as-date>Today</div>',
      '<div class="as-typing" data-as-typing hidden><span></span><span></span><span></span></div>',
      '<form class="as-form" data-as-form>',
      '<div class="as-input-row">',
      '<input data-as-input type="text" placeholder="Ask about products, comparisons, or the store…" autocomplete="off" />',
      '<button class="as-send" type="submit" aria-label="Send">',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      "</button>",
      "</div>",
      "</form>",
      "</section>",
    ].join("");
    return shell;
  }

  function renderProductCard(product) {
    return [
      '<a class="as-product" href="/product.html?id=' + product.id + '">',
      '<img src="' + product.imageUrl + '" alt="' + escapeHtml(product.name) + '" loading="lazy" />',
      '<div class="as-product-body">',
      "<strong>" + escapeHtml(product.name) + "</strong>",
      "<span>" + escapeHtml(product.category) + "</span>",
      "</div>",
      '<div class="as-product-price">',
      "<strong>" + formatPrice(product.price) + "</strong>",
      "<span>" + product.rating.toFixed(1) + " ★</span>",
      "</div>",
      "</a>",
    ].join("");
  }

  var lastRole = null;

  function groupRole(role) {
    var connected = role === lastRole;
    lastRole = role;
    return connected;
  }

  function addMsg(container, role, html) {
    var connected = groupRole(role);
    var isUser = role === "user";
    var isProducts = role === "bot products";

    var wrap = document.createElement("div");
    wrap.className = "as-row " + role + (connected ? " connected" : "") + (isProducts ? " products" : "");

    var avatarHtml = "";
    if (!connected) {
      avatarHtml = isUser
        ? '<span class="as-avatar as-avatar-user">' + escapeHtml((window.__ponnaloyUserName || "U")[0].toUpperCase()) + "</span>"
        : '<span class="as-avatar as-avatar-bot"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>';
    }

    var timeHtml = '<span class="as-time">' + time() + "</span>";

    var bubble = '<div class="as-bubble">' + html + timeHtml + "</div>";

    if (isUser) {
      wrap.innerHTML = avatarHtml + bubble;
    } else {
      wrap.innerHTML = avatarHtml + bubble;
    }

    container.appendChild(wrap);

    var gap = container.querySelector(".as-date-divider");
    if (gap) container.appendChild(gap);

    requestAnimationFrame(function () {
      wrap.style.opacity = "1";
      wrap.style.transform = "translateY(0)";
    });

    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function addProductMsg(container, products) {
    lastRole = null;
    var wrap = document.createElement("div");
    wrap.className = "as-row bot products";

    var avatarHtml = '<span class="as-avatar as-avatar-bot"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>';
    var timeHtml = '<span class="as-time">' + time() + "</span>";

    wrap.innerHTML = avatarHtml + '<div class="as-bubble">' + '<div class="as-product-list">' + products.map(renderProductCard).join("") + "</div>" + timeHtml + "</div>";

    container.appendChild(wrap);

    requestAnimationFrame(function () {
      wrap.style.opacity = "1";
      wrap.style.transform = "translateY(0)";
    });

    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function showTyping(typing) {
    typing.hidden = false;
    typing.querySelectorAll("span").forEach(function (s) {
      s.style.animation = "none";
      void s.offsetHeight;
      s.style.animation = "";
    });
  }

  function hideTyping(typing) {
    typing.hidden = true;
  }

  async function send(panel, text, input) {
    var msg = (text || "").trim();
    if (!msg) return;

    var msgs = panel.querySelector("[data-as-msgs]");
    var typing = panel.querySelector("[data-as-typing]");

    addMsg(msgs, "user", "<p>" + escapeHtml(msg) + "</p>");

    showTyping(typing);

    if (input) input.value = "";

    try {
      var res = await api("/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      });

      hideTyping(typing);

      var toneLabel = res.tone === "comparison" ? "Comparison" : res.tone === "recommendation" ? "Recommendation" : "Product";
      var replyParts = [];

      replyParts.push('<div class="as-msg-head"><span class="as-tag">' + escapeHtml(toneLabel) + "</span></div>");
      replyParts.push("<p>" + escapeHtml(res.reply) + "</p>");

      if (res.followUp) {
        replyParts.push('<p class="as-follow">' + escapeHtml(res.followUp) + "</p>");
      }

      if (res.comparison && res.comparison.points) {
        replyParts.push('<div class="as-compare-card"><strong>Comparison</strong><ul>' + res.comparison.points.map(function (p) { return "<li>" + escapeHtml(p) + "</li>"; }).join("") + "</ul></div>");
      }

      addMsg(msgs, "bot", replyParts.join(""));

      var highlights = res.highlights || [];
      var picks = res.valuePicks || [];

      if (highlights.length || picks.length) {
        lastRole = null;
        var summaryParts = [];
        if (highlights.length) {
          summaryParts.push('<div class="as-summary-group"><span class="as-summary-label">Highlights</span><div class="as-pills">' + highlights.map(function (p) { return '<a class="as-pill" href="/product.html?id=' + p.id + '">' + escapeHtml(p.name) + " · " + formatPrice(p.price) + "</a>"; }).join("") + "</div></div>");
        }
        if (picks.length) {
          summaryParts.push('<div class="as-summary-group"><span class="as-summary-label">Value picks</span><div class="as-pills">' + picks.map(function (p) { return '<a class="as-pill" href="/product.html?id=' + p.id + '">' + escapeHtml(p.name) + " · " + p.rating.toFixed(1) + "★</a>"; }).join("") + "</div></div>");
        }
        addMsg(msgs, "bot summary", summaryParts.join(""));
      }

      if (res.matches && res.matches.length) {
        lastRole = null;
        addProductMsg(msgs, res.matches);
      }
    } catch (err) {
      hideTyping(typing);
      addMsg(msgs, "bot", "<p>" + escapeHtml(err.message || "Unable to process your request.") + "</p>");
      if (window.showToast) showToast("Assistant error", err.message || "Unable to reach the assistant.");
    }
  }

  function mount() {
    if (document.querySelector("[data-as-panel]")) return;

    var shell = createMarkup();
    document.body.appendChild(shell);

    var panel = shell.querySelector("[data-as-panel]");
    var msgs = shell.querySelector("[data-as-msgs]");
    var input = shell.querySelector("[data-as-input]");
    var openBtn = shell.querySelector("[data-as-open]");
    var closeBtn = shell.querySelector("[data-as-close]");
    var form = shell.querySelector("[data-as-form]");

    addMsg(msgs, "bot", '<div class="as-msg-head"><span class="as-tag">Welcome</span></div><p>I can help you find products, compare options, and answer questions about the store.</p>');

    openBtn.addEventListener("click", function () {
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      setTimeout(function () { return input && input.focus(); }, 250);
    });

    closeBtn.addEventListener("click", function () {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
    });

    shell.querySelectorAll("[data-as-prompt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        panel.classList.add("open");
        panel.setAttribute("aria-hidden", "false");
        send(panel, btn.dataset.asPrompt, input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      send(panel, input.value, input);
    });
  }

  document.addEventListener("DOMContentLoaded", mount);
  window.PonnaloyAssistant = {
    open: function () {
      var panel = document.querySelector("[data-as-panel]");
      var input = document.querySelector("[data-as-input]");
      if (!panel) return;
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      setTimeout(function () { return input && input.focus(); }, 250);
    },
  };
})();
