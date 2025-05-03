const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const Service = require('../models/Service');
const { verifyToken } = require('../middleware/auth');

// Create a new package
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, services, originalPrice, discountedPrice, discount } = req.body;

    // Verify all services exist and belong to the vendor
    for (const service of services) {
      const existingService = await Service.findOne({
        _id: service.serviceId,
        vendor: req.vendor.id
      });

      if (!existingService) {
        return res.status(404).json({
          success: false,
          message: `Service with ID ${service.serviceId} not found or doesn't belong to you`
        });
      }
    }

    const package = new Package({
      name,
      services,
      originalPrice,
      discountedPrice,
      discount,
      vendor: req.vendor.id
    });

    await package.save();

    res.status(201).json({
      success: true,
      data: package
    });
  } catch (err) {
    console.error('Create package error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create package',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all packages (public access)
router.get('/', async (req, res) => {
  try {
    const packages = await Package.find()
      .populate('vendor', 'businessName email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (err) {
    console.error('Fetch packages error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages'
    });
  }
});

// Get vendor's own packages (vendor access only)
router.get('/vendor/my-packages', verifyToken, async (req, res) => {
  try {
    const packages = await Package.find({ vendor: req.vendor.id })
      .populate('vendor', 'businessName email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (err) {
    console.error('Fetch vendor packages error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages'
    });
  }
});

// Delete a package
router.delete('/:packageId', verifyToken, async (req, res) => {
  try {
    const package = await Package.findOne({
      _id: req.params.packageId,
      vendor: req.vendor.id
    });

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Package not found or you are not authorized to delete it'
      });
    }

    await Package.findByIdAndDelete(req.params.packageId);

    res.status(200).json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (err) {
    console.error('Delete package error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete package',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
