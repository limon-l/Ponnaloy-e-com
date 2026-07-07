const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const morgan = require("morgan");
const SQLiteStoreFactory = require("connect-sqlite3");
const OpenAI = require("openai");
const {
  initDatabase,
  listProducts,
  getProductById,
  getProductBySlug,
  findUserByEmail,
  createUser,
  getUserById,
  createOrder,
  listOrdersForUser,
  listFeaturedProducts,
  searchProducts,
} = require("./db");

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);
const PORT = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET || "ponnaloy-store-secret";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    store: new SQLiteStore({
      db: "sessions.db",
      dir: path.join(__dirname, "data"),
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(express.static(path.join(__dirname, "public")));

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please log in to continue." });
  }
  return next();
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreProduct(product, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const haystack = normalizeText(
    `${product.name} ${product.category} ${product.badge} ${product.description}`,
  );
  const tokens = normalizedQuery.split(" ");
  let score = 0;

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (haystack.includes(token)) {
      score += 2;
    }
  }

  if (haystack.includes(normalizedQuery)) {
    score += 6;
  }

  return score;
}

function findTopProducts(products, query, limit = 3) {
  return [...products]
    .map((product) => ({ product, score: scoreProduct(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || right.product.rating - left.product.rating,
    )
    .slice(0, limit)
    .map((entry) => entry.product);
}

function findProductMention(message, products) {
  const normalizedMessage = normalizeText(message);
  let bestMatch = null;
  let bestScore = 0;

  for (const product of products) {
    const normalizedName = normalizeText(product.name);
    if (!normalizedName) continue;

    if (
      normalizedMessage.includes(normalizedName) &&
      normalizedName.length > bestScore
    ) {
      bestMatch = product;
      bestScore = normalizedName.length;
    }
  }

  return bestMatch;
}

function compareProducts(left, right) {
  const winner =
    left.rating > right.rating
      ? left
      : right.rating > left.rating
        ? right
        : left.price < right.price
          ? left
          : right;

  const fmt = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return {
    summary: `${left.name} has a ${left.rating.toFixed(1)} rating at ${fmt(left.price)}. ${right.name} has a ${right.rating.toFixed(1)} rating at ${fmt(right.price)}. Based on these metrics, ${winner.name} is the stronger option.`,
    points: [
      `${left.name} — ${left.category}, ${left.rating.toFixed(1)} stars, ${left.stock} in stock, ${fmt(left.price)}`,
      `${right.name} — ${right.category}, ${right.rating.toFixed(1)} stars, ${right.stock} in stock, ${fmt(right.price)}`,
      `Recommended: ${winner.name}`,
    ],
  };
}

function buildStoreFacts(products) {
  const categories = [...new Set(products.map((product) => product.category))];
  const topRated = [...products]
    .sort(
      (left, right) => right.rating - left.rating || left.price - right.price,
    )
    .slice(0, 4);
  const bestValue = [...products]
    .sort(
      (left, right) => left.price - right.price || right.rating - left.rating,
    )
    .slice(0, 4);

  return {
    productCount: products.length,
    categoryCount: categories.length,
    categories,
    topRated,
    bestValue,
  };
}

function buildAssistantReply(message, matches, products) {
  const compareMode =
    /\b(compare|versus|vs|difference|better|which is better)\b/.test(message);
  const helpMode =
    /\b(help|about|store|site|catalog|checkout|shipping|delivery|return|policy|how do i)\b/.test(
      message,
    );
  const greetingMode = /\b(hi|hello|hey|thanks|thank you)\b/.test(message);
  const recommendationMode =
    /\b(recommend|suggest|pick|best|top|good for|for work|for travel|for home)\b/.test(
      message,
    );
  const explicitMention = findProductMention(message, products);
  const compareTargetMatch = message.match(
    /\b(?:compare|versus|vs|with)\b[\s\S]*?\b(?:with|to)\s+(.+)$/i,
  );
  const explicitCompareTarget = compareTargetMatch
    ? findProductMention(compareTargetMatch[1], products)
    : null;
  const primaryQuery = message
    .split(/\bcompare\b|\bversus\b|\bvs\b/i)[0]
    .trim();
  const primaryMatches = primaryQuery
    ? findTopProducts(
        products.filter((product) => product.id !== explicitCompareTarget?.id),
        primaryQuery,
        3,
      )
    : matches;

  if (compareMode) {
    const left =
      primaryMatches[0] || explicitMention || matches[0] || products[0];
    const right =
      explicitCompareTarget ||
      primaryMatches.find((product) => product.id !== left?.id) ||
      matches.find((product) => product.id !== left?.id) ||
      products.find((product) => product.id !== left?.id);

    if (left && right) {
      const comparison = compareProducts(left, right);
      return {
        reply: comparison.summary,
        tone: "comparison",
        focusCategory: left.category,
        followUp:
          "You can compare another pair or ask for a recommendation by use case.",
        comparison,
      };
    }
  }

  if (recommendationMode && matches.length > 0) {
    const hero = explicitMention || matches[0];
    const secondary =
      matches.find((product) => product.id !== hero.id) || matches[1];
    const fmt = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    return {
      reply: `${hero.name} is the strongest match for this request. It has a ${hero.rating.toFixed(1)} rating, ${hero.stock} units in stock, and is priced at ${fmt(hero.price)}.`,
      tone: "recommendation",
      focusCategory: hero.category,
      followUp: secondary
        ? `An alternative is ${secondary.name} (${secondary.rating.toFixed(1)} stars, ${fmt(secondary.price)}).`
        : "Specify your budget or use case for a more targeted recommendation.",
      comparison: null,
    };
  }

  if (matches.length > 0) {
    const [topMatch] = matches;
    const fmt = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    return {
      reply: `${topMatch.name} is available in ${topMatch.category.toLowerCase()} at ${fmt(topMatch.price)}. It has a ${topMatch.rating.toFixed(1)} rating with ${topMatch.stock} units in stock.`,
      tone: "product",
      focusCategory: topMatch.category,
      followUp: "Ask for a comparison or a similar product at a different price point.",
      comparison: null,
    };
  }

  if (greetingMode || helpMode) {
    return {
      reply: `Ponnaloy carries ${products.length} products across multiple categories with search, cart checkout, and product comparison tools.`,
      tone: "platform",
      focusCategory: "Store overview",
      followUp: "You can ask about products, compare items, or request recommendations.",
      comparison: null,
    };
  }

  return {
    reply: `No products matched your query. Try a specific product name, category, or use "compare" to see differences between two products.`,
    tone: "fallback",
    focusCategory: "Catalog",
    followUp: "You can also ask for recommendations by use case — work, travel, home, or audio.",
    comparison: null,
  };
}

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    res.json({ status: "ok" });
  }),
);

app.get(
  "/api/products",
  asyncHandler(async (req, res) => {
    const { q, featured } = req.query;
    let products;
    if (q) {
      products = await searchProducts(q);
    } else if (featured === "true") {
      products = await listFeaturedProducts();
    } else {
      products = await listProducts();
    }
    res.json({ products });
  }),
);

app.get(
  "/api/products/:identifier",
  asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    const product = /^\d+$/.test(identifier)
      ? await getProductById(Number(identifier))
      : await getProductBySlug(identifier);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({ product });
  }),
);

app.get(
  "/products",
  asyncHandler(async (req, res) => {
    res.sendFile(path.join(__dirname, "public", "products.html"));
  }),
);

app.get(
  "/api/me",
  asyncHandler(async (req, res) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }
    const user = await getUserById(req.session.userId);
    res.json({ user: sanitizeUser(user) });
  }),
);

app.post(
  "/api/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const user = await createUser({ name, email, password });
    req.session.userId = user.id;
    res.status(201).json({ user: sanitizeUser(user) });
  }),
);

app.post(
  "/api/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await findUserByEmail(email);
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    req.session.userId = user.id;
    res.json({ user: sanitizeUser(user) });
  }),
);

app.post(
  "/api/logout",
  asyncHandler(async (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "Unable to log out right now." });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully." });
    });
  }),
);

app.get(
  "/api/orders",
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await listOrdersForUser(req.session.userId);
    res.json({ orders });
  }),
);

app.post(
  "/api/orders",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { items, customerName, shippingAddress, phone, email } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart items are required." });
    }

    if (!customerName || !shippingAddress || !phone || !email) {
      return res
        .status(400)
        .json({ message: "Checkout details are incomplete." });
    }

    const order = await createOrder({
      userId: req.session.userId,
      items,
      customerName,
      shippingAddress,
      phone,
      email,
    });

    res.status(201).json({ order });
  }),
);

app.post(
  "/api/chat",
  asyncHandler(async (req, res) => {
    const rawMessage = (req.body?.message || "").trim();

    if (!rawMessage) {
      return res.status(400).json({ message: "A message is required." });
    }

    const products = await listProducts();
    const normalizedMessage = normalizeText(rawMessage);
    const matches = findTopProducts(products, normalizedMessage, 6);
    const storeFacts = buildStoreFacts(products);
    const mention = findProductMention(rawMessage, products);

    if (!openai) {
      const assistant = buildAssistantReply(normalizedMessage, matches, products);
      return res.json({
        reply: assistant.reply,
        tone: assistant.tone,
        focusCategory: assistant.focusCategory,
        followUp: assistant.followUp,
        storeFacts: {
          productCount: storeFacts.productCount,
          categoryCount: storeFacts.categoryCount,
          categories: storeFacts.categories,
        },
        highlights: storeFacts.topRated.slice(0, 3),
        valuePicks: storeFacts.bestValue.slice(0, 3),
        matches: matches.length > 0 ? matches : storeFacts.topRated.slice(0, 4),
        comparison: assistant.comparison,
      });
    }

    if (!req.session.chatHistory) {
      req.session.chatHistory = [];
    }

    req.session.chatHistory.push({ role: "user", content: rawMessage });
    if (req.session.chatHistory.length > 20) {
      req.session.chatHistory = req.session.chatHistory.slice(-20);
    }

    const topProducts = matches.length >= 3
      ? matches
      : [...matches, ...storeFacts.topRated.filter((p) => !matches.find((m) => m.id === p.id))].slice(0, 6);

    const productCatalog = topProducts
      .map(
        (p) =>
          `- ${p.name} (id:${p.id}) | category: ${p.category} | price: $${p.price} | rating: ${p.rating}/5 | stock: ${p.stock} | badge: ${p.badge || "none"} | features: ${p.shortDescription}`,
      )
      .join("\n");

    const categoriesList = storeFacts.categories.join(", ");

    const systemPrompt = `You are Marvin, a friendly and knowledgeable shopping assistant for Ponnaloy, an e-commerce store.

Store overview:
- ${storeFacts.productCount} products across categories: ${categoriesList}
- Current user message: "${rawMessage}"

Relevant products in the catalog:
${productCatalog}

Guidelines:
- Be conversational, warm, and helpful. Use natural language.
- If the user greets you, greet them back warmly as Marvin.
- When recommending products, mention specific product names and key details (price, rating).
- If the user asks about a product, category, or use case, suggest the most relevant products from the list above.
- If asked to compare, explain the differences between products clearly.
- Keep replies concise (2-4 sentences usually), but thorough enough to be helpful.
- Never mention that you are an AI or language model. You are Marvin, the store's shopping assistant.
- If you cannot find a matching product, suggest browsing by category or ask what they're looking for.
- Always end with a brief follow-up question to keep the conversation going.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...req.session.chatHistory,
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

      req.session.chatHistory.push({ role: "assistant", content: reply });
      if (req.session.chatHistory.length > 20) {
        req.session.chatHistory = req.session.chatHistory.slice(-20);
      }

      const tone = mention
        ? "product"
        : /\b(compare|versus|vs|difference)\b/i.test(rawMessage)
          ? "comparison"
          : /\b(recommend|suggest|best|top|good for)\b/i.test(rawMessage)
            ? "recommendation"
            : /\b(hi|hello|hey|thanks)\b/i.test(rawMessage)
              ? "greeting"
              : "product";

      const followUp = "Is there anything else you'd like to know?";

      return res.json({
        reply,
        tone,
        focusCategory: mention?.category || (matches[0]?.category ?? "General"),
        followUp,
        storeFacts: {
          productCount: storeFacts.productCount,
          categoryCount: storeFacts.categoryCount,
          categories: storeFacts.categories,
        },
        highlights: storeFacts.topRated.slice(0, 3),
        valuePicks: storeFacts.bestValue.slice(0, 3),
        matches: matches.length > 0 ? matches : storeFacts.topRated.slice(0, 4),
        comparison: null,
      });
    } catch (error) {
      console.error("OpenAI chat error:", error);
      return res.status(500).json({ message: "The assistant is unavailable right now. Please try again." });
    }
  }),
);

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Route not found." });
  }

  if (path.extname(req.path)) {
    return res.status(404).send("Not found");
  }

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server." });
});

(async () => {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Ponnaloy e-com running at http://localhost:${PORT}`);
  });
})();
