const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const {
  getAdminStats,
  adminListAllOrders,
  adminUpdateOrderStatus,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminListAllUsers,
  listProducts,
} = require("../db");

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please log in to continue." });
  }
  const { getUserById } = require("../db");
  getUserById(req.session.userId).then((user) => {
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required." });
    }
    next();
  }).catch(() => {
    res.status(500).json({ message: "Server error." });
  });
}

router.get("/stats", requireAdmin, asyncHandler(async (req, res) => {
  const stats = await getAdminStats();
  res.json({ stats });
}));

router.get("/orders", requireAdmin, asyncHandler(async (req, res) => {
  const orders = await adminListAllOrders();
  res.json({ orders });
}));

router.put("/orders/:orderId/status", requireAdmin, asyncHandler(async (req, res) => {
  const orderId = Number(req.params.orderId);
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: "Status is required." });
  const order = await adminUpdateOrderStatus(orderId, status);
  if (!order) return res.status(404).json({ message: "Order not found." });
  res.json({ order });
}));

router.get("/products", requireAdmin, asyncHandler(async (req, res) => {
  const products = await listProducts();
  res.json({ products });
}));

router.post("/products", requireAdmin, asyncHandler(async (req, res) => {
  const product = await adminCreateProduct(req.body);
  res.status(201).json({ product });
}));

router.put("/products/:productId", requireAdmin, asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  const product = await adminUpdateProduct(productId, req.body);
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json({ product });
}));

router.delete("/products/:productId", requireAdmin, asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  const deleted = await adminDeleteProduct(productId);
  if (!deleted) return res.status(404).json({ message: "Product not found." });
  res.json({ message: "Product deleted." });
}));

router.get("/users", requireAdmin, asyncHandler(async (req, res) => {
  const users = await adminListAllUsers();
  res.json({ users });
}));

module.exports = router;
