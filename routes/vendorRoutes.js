const express = require("express");
const Vendor = require("../models/Vendor");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


// GET: Fetch all vendors
router.get("/vendors", async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.json(vendors);
  } catch (err) {
    console.error("Error fetching vendors:", err.message);
    res.status(500).json({ error: "Failed to fetch vendors." });
  }
});
// GET: Fetch single vendor by ID
// In your vendorRoutes.js (backend)
router.get("/vendors/:id", async (req, res) => {
  try {
     // Add ID validation
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid vendor ID format" });
    }
    const vendor = await Vendor.findById(req.params.id)
      .select('-password -__v -role  -createdAt');

    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    res.json({
      success: true,
      data: {
        // Include all necessary fields
        _id: vendor._id,
        businessName: vendor.businessName,
        ownerName: vendor.ownerName,
        email: vendor.email,
        phone: vendor.phone,
        designation: vendor.designation,
        description: vendor.description,
        logo: vendor.logo,
        portfolio: vendor.portfolio || [],
        services: vendor.services || [],
        contact: {
          address: vendor.contact?.address || '',
          phone: vendor.contact?.phone || '',
          email: vendor.contact?.email || '',
          website: vendor.contact?.website || '',
          availability: vendor.contact?.availability || '',
          experience: vendor.contact?.experience || ''
        }
      }
    });
  } catch (err) {
    console.error("Error fetching vendor:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});
// PUT: Toggle approval status (approve/revoke)
router.put("/vendors/:id/approval", async (req, res) => {
  const { isApproved } = req.body;
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    );

    if (!vendor) return res.status(404).json({ error: "Vendor not found." });

    res.json(vendor);
  } catch (err) {
    console.error("Error updating approval status:", err.message);
    res.status(500).json({ error: "Failed to update approval status." });
  }
});

// PUT: Update vendor details
router.put("/vendors/:id/details", upload.single('logo'), async (req, res) => {
  try {
    const updateData = {
      businessName: req.body.businessName,
      ownerName: req.body.ownerName,
      email: req.body.email,
      phone: req.body.phone,
      description: req.body.description,
      services: req.body.services?.split(',') || [], // Convert to array
      portfolio: req.body.portfolio?.split(',') || [] // Convert to array
    };

    // Handle logo file path if uploaded
    if (req.file) {
      updateData.logo = req.file.path;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      updateData, // 👈 Send all fields
      { new: true, runValidators: true }
    );

    if (!vendor) return res.status(404).json({ error: "Vendor not found." });
    
    res.json({
      success: true,
      data: vendor // Return full vendor data
    });
    
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ 
      error: err.message || "Failed to update vendor details" 
    });
  }
});

// DELETE: Remove a vendor
router.delete("/vendors/:id", async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!vendor) return res.status(404).json({ error: "Vendor not found." });

    res.json({ message: "Vendor deleted successfully." });
  } catch (err) {
    console.error("Error deleting vendor:", err.message);
    res.status(500).json({ error: "Failed to delete vendor." });
  }
});

module.exports = router;
