const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const { sanitizeUser } = require("../utils/sanitize");
const { findUserByEmail, createUser, getUserById } = require("../db");

const router = Router();

router.get("/me", asyncHandler(async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await getUserById(req.session.userId);
  res.json({ user: sanitizeUser(user) });
}));

router.post("/register", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }
  const existing = await findUserByEmail(email);
  if (existing) return res.status(409).json({ message: "An account with this email already exists." });
  const user = await createUser({ name, email, password });
  req.session.userId = user.id;
  res.status(201).json({ user: sanitizeUser(user) });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }
  const user = await findUserByEmail(email);
  if (!user || !(await user.verifyPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  req.session.userId = user.id;
  res.json({ user: sanitizeUser(user) });
}));

router.post("/logout", asyncHandler(async (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ message: "Unable to log out right now." });
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully." });
  });
}));

module.exports = router;
