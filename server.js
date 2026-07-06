const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const morgan = require("morgan");
const SQLiteStoreFactory = require("connect-sqlite3");
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
    .sort((left, right) => right.score - left.score || right.product.rating - left.product.rating)
    .slice(0, limit)
    .map((entry) => entry.product);
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

  return {
    summary: `${left.name} and ${right.name} are both premium picks, but ${winner.name} is the stronger fit based on rating and value.`,
    points: [
      `${left.name}: ${left.category}, ${left.rating.toFixed(1)} rating, ${left.stock} in stock, ${left.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
      `${right.name}: ${right.category}, ${right.rating.toFixed(1)} rating, ${right.stock} in stock, ${right.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
      `Best overall: ${winner.name}`,
    ],
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
    const message = normalizeText(req.body?.message);

    if (!message) {
      return res.status(400).json({ message: "A message is required." });
    }

    const products = await listProducts();
    const featuredProducts = products.filter((product) => product.featured).slice(0, 5);
    const compareMode = /\b(compare|versus|vs|difference|better|which is better)\b/.test(message);
    const helpMode = /\b(help|about|store|site|catalog|checkout|shipping|delivery|return|policy)\b/.test(message);
    const greetingMode = /\b(hi|hello|hey|thanks|thank you)\b/.test(message);
    const matches = findTopProducts(products, message, compareMode ? 4 : 3);

    if (compareMode && matches.length >= 2) {
      const comparison = compareProducts(matches[0], matches[1]);
      return res.json({
        reply: comparison.summary,
        matches: matches.slice(0, 4),
        comparison,
      });
    }

    if (matches.length > 0) {
      const [topMatch] = matches;
      return res.json({
        reply: `${topMatch.name} is a ${topMatch.category.toLowerCase()} standout with a ${topMatch.rating.toFixed(1)} rating and ${topMatch.stock} units in stock. It is priced at ${topMatch.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} and built for shoppers who want premium value.`,
        matches,
        comparison: null,
      });
    }

    if (greetingMode || helpMode) {
      return res.json({
        reply: `Ponnaloy is a premium storefront with ${products.length} curated products, fast cart handling, secure auth, and checkout. I can compare products, explain features, and help you find the right pick.`,
        matches: featuredProducts,
        comparison: null,
      });
    }

    return res.json({
      reply: `I searched the catalog and did not find an exact match. Try asking for a product name, a category like audio or travel, or say "compare" followed by two products.`,
      matches: featuredProducts,
      comparison: null,
    });
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
