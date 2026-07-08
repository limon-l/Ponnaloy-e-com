const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { listProducts, getProductById, getProductBySlug, listFeaturedProducts, searchProducts } = require("../db");

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const { q, featured, category } = req.query;
  let products;
  if (q) {
    products = await searchProducts(q);
  } else if (featured === "true") {
    products = await listFeaturedProducts();
  } else {
    products = await listProducts();
  }
  if (category) {
    products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  res.json({ products, total: products.length });
}));

router.get("/categories", asyncHandler(async (req, res) => {
  const products = await listProducts();
  const categories = [...new Set(products.map((p) => p.category))].sort();
  res.json({ categories });
}));

router.get("/:identifier", asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const product = /^\d+$/.test(identifier)
    ? await getProductById(Number(identifier))
    : await getProductBySlug(identifier);
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json({ product });
}));

module.exports = router;
