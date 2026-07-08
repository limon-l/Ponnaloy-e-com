const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const SQLiteStoreFactory = require("connect-sqlite3");

const env = require("./config/env");
const { initDatabase } = require("./db");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);

/* ── Global middleware ── */
app.use(compression({ level: 6 }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Rate limiting ── */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
app.use("/api/", limiter);

/* ── Sessions ── */
app.use(session({
  store: new SQLiteStore({
    db: "sessions.db",
    dir: path.join(__dirname, "..", "data"),
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

/* ── Static files ── */
app.use(express.static(path.join(__dirname, "..", "frontend", "public"), {
  maxAge: "1h",
  etag: true,
}));

/* ── API routes ── */
app.use("/api/health", require("./routes/health"));
app.use("/api", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/chat", require("./routes/chat"));

/* ── Newsletter ── */
const asyncHandler = require("./middleware/asyncHandler");
app.post("/api/newsletter", asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) return res.status(400).json({ message: "Invalid email format." });
  res.json({ message: "Thank you for subscribing!", email });
}));

/* ── Serve HTML pages ── */
app.get("/products", asyncHandler(async (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "public", "products.html"));
}));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ message: "Route not found." });
  if (path.extname(req.path)) return res.status(404).send("Not found");
  res.sendFile(path.join(__dirname, "..", "frontend", "public", "index.html"));
});

/* ── Error handler ── */
app.use(errorHandler);

/* ── Boot ── */
(async () => {
  await initDatabase();
  app.listen(env.port, () => {
    console.log(`Ponnaloy e-com running at http://localhost:${env.port}`);
  });
})();
