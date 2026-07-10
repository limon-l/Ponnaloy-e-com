const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const { getWishlistForUser, toggleWishlistItem } = require("../db");

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const items = await getWishlistForUser(req.session.userId);
  res.json({ wishlist: items });
}));

router.post("/toggle", requireAuth, asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ message: "Product ID is required." });
  const result = await toggleWishlistItem(req.session.userId, Number(productId));
  res.json(result);
}));

module.exports = router;
