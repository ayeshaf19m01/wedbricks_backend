// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor'); 

// PUT /api/admin/vendors/:id/approval
router.put('/vendors/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
   
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.isApproved = isApproved;
    vendor.approvedBy = new mongoose.Types.ObjectId('68063341f0a8aa836d353d1b'); // Replace with actual logged-in admin ID
    vendor.approvedAt = new Date();

    await vendor.save();
    res.status(200).json(vendor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
