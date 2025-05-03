const mongoose = require('mongoose');
const Vendor = require('../models/vendorModel');

const approveVendor = async (req, res) => {
  const { vendorId } = req.params;
  const { isApproved } = req.body;
  const adminId = req.user.id;

  // Validate ID formats
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return res.status(400).json({ 
      error: "Invalid Vendor ID format" 
    });
  }

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return res.status(400).json({ 
      error: "Invalid Admin ID format" 
    });
  }

  try {
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({ 
        error: 'Vendor not found' 
      });
    }

    // Convert string ID to ObjectId
    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    
    // Update approval status
    vendor.isApproved = isApproved;
    vendor.approvedBy = adminObjectId;
    vendor.approvedAt = Date.now();

    const updatedVendor = await vendor.save();

    res.status(200).json({
      message: `Vendor ${isApproved ? 'approved' : 'unapproved'} successfully`,
      vendor: updatedVendor
    });

  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: "Invalid ID format in request" 
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: Object.values(error.errors).map(val => val.message) 
      });
    }

    // Development error logging
    const errorResponse = {
      error: 'Server error',
      ...(process.env.NODE_ENV === 'development' && {
        message: error.message,
        stack: error.stack
      })
    };

    res.status(500).json(errorResponse);
  }
};

module.exports = {
  approveVendor
};