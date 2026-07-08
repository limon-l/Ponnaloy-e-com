const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const { createOrder, listOrdersForUser } = require("../db");

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const orders = await listOrdersForUser(req.session.userId);
  res.json({ orders });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { items, customerName, shippingAddress, phone, email } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart items are required." });
  }
  if (!customerName || !shippingAddress || !phone || !email) {
    return res.status(400).json({ message: "Checkout details are incomplete." });
  }
  const order = await createOrder({
    userId: req.session.userId, items, customerName, shippingAddress, phone, email,
  });
  res.status(201).json({ order });
}));

module.exports = router;
