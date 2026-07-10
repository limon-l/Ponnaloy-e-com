const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const { getReviewsForProduct, createReview, deleteReview, getProductReviewStats } = require("../db");

const router = Router();

router.get("/product/:productId", asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  if (!productId) return res.status(400).json({ message: "Invalid product ID." });
  const [reviews, stats] = await Promise.all([
    getReviewsForProduct(productId),
    getProductReviewStats(productId),
  ]);
  res.json({ reviews, stats });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { productId, rating, title, comment } = req.body;
  if (!productId || !rating) {
    return res.status(400).json({ message: "Product ID and rating are required." });
  }
  const numRating = Number(rating);
  if (numRating < 1 || numRating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }
  const result = await createReview({
    userId: req.session.userId,
    productId: Number(productId),
    rating: numRating,
    title: title || "",
    comment: comment || "",
  });
  res.status(201).json({ review: result });
}));

router.delete("/:reviewId", requireAuth, asyncHandler(async (req, res) => {
  const reviewId = Number(req.params.reviewId);
  const deleted = await deleteReview(reviewId, req.session.userId);
  if (!deleted) return res.status(404).json({ message: "Review not found or not authorized." });
  res.json({ message: "Review deleted." });
}));

module.exports = router;
