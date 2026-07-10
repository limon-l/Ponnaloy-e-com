const { Router } = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const requireAuth = require("../middleware/requireAuth");
const { getAddressesForUser, createAddress, updateAddress, deleteAddress } = require("../db");

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const addresses = await getAddressesForUser(req.session.userId);
  res.json({ addresses });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { label, fullName, addressLine1, addressLine2, city, state, zipCode, phone, isDefault } = req.body;
  if (!fullName || !addressLine1) {
    return res.status(400).json({ message: "Full name and address line 1 are required." });
  }
  const address = await createAddress(req.session.userId, {
    label, fullName, addressLine1, addressLine2, city, state, zipCode, phone, isDefault,
  });
  res.status(201).json({ address });
}));

router.put("/:addressId", requireAuth, asyncHandler(async (req, res) => {
  const addressId = Number(req.params.addressId);
  const address = await updateAddress(addressId, req.session.userId, req.body);
  if (!address) return res.status(404).json({ message: "Address not found." });
  res.json({ address });
}));

router.delete("/:addressId", requireAuth, asyncHandler(async (req, res) => {
  const deleted = await deleteAddress(Number(req.params.addressId), req.session.userId);
  if (!deleted) return res.status(404).json({ message: "Address not found." });
  res.json({ message: "Address deleted." });
}));

module.exports = router;
