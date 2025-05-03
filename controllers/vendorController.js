// controllers/vendorController.js

const Vendor = require("../models/Vendor");

// Get Vendor Profile
exports.getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id).select("-password");
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching vendor profile" });
  }
};

// Update Vendor Profile
exports.updateVendorProfile = async (req, res) => {
  const allowedFields = [
    "businessName",
    "ownerName",
    "email",
    "phone",
    "description",
    "logo",
    "service",
  ];
  const updateData = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  try {
    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedVendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    res.status(200).json({ success: true, data: updatedVendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error updating vendor profile" });
  }
};
