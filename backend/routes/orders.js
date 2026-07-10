const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const { createOrder, listOrdersForUser, getOrderById } = require("../db");

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const orders = await listOrdersForUser(req.session.userId);
  res.json({ orders });
}));

router.get("/:orderId", requireAuth, asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  const order = await getOrderById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (order.userId !== req.session.userId) {
    return res.status(403).json({ message: "Not authorized." });
  }
  res.json({ order });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { items, customerName, shippingAddress, phone, email, paymentMethod, promoCode } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart items are required." });
  }
  if (!customerName || !shippingAddress || !phone || !email) {
    return res.status(400).json({ message: "Checkout details are incomplete." });
  }
  const order = await createOrder({
    userId: req.session.userId, items, customerName, shippingAddress, phone, email,
    paymentMethod: paymentMethod || "card",
    promoCode: promoCode || null,
  });
  res.status(201).json({ order });
}));

module.exports = router;
