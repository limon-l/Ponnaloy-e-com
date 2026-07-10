const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const { getUserById, updateUserProfile, updateUserPassword } = require("../db");
const { sanitizeUser } = require("../utils/sanitize");

const router = Router();

router.get("/profile", requireAuth, asyncHandler(async (req, res) => {
  const user = await getUserById(req.session.userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user: sanitizeUser(user) });
}));

router.put("/profile", requireAuth, asyncHandler(async (req, res) => {
  const { name, phone, avatarUrl } = req.body;
  const user = await updateUserProfile(req.session.userId, { name, phone, avatarUrl });
  res.json({ user: sanitizeUser(user) });
}));

router.put("/password", requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters." });
  }
  const user = await getUserById(req.session.userId);
  const fullUser = await require("../db").findUserByEmail(user.email);
  if (currentPassword && !(await fullUser.verifyPassword(currentPassword))) {
    return res.status(401).json({ message: "Current password is incorrect." });
  }
  await updateUserPassword(req.session.userId, newPassword);
  res.json({ message: "Password updated successfully." });
}));

module.exports = router;
