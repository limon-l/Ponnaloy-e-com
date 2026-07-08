const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
}));

module.exports = router;
