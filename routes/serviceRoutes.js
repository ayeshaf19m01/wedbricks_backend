const express = require('express');
const router = express.Router();
const multer = require('multer');
const Service = require('../models/Service');
const { verifyToken } = require('../middleware/auth');
const { serviceUpload } = require('../config/multer'); // Use the exported serviceUpload
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Add new service
router.post('/', verifyToken, serviceUpload, async (req, res) => {
  try {
    const { body, files } = req;
    
    // Convert comma-separated strings to arrays
    const parseArrayField = (field) => 
      field ? field.split(',').map(item => item.trim()) : [];
    const serviceData = {
      vendor: req.vendor.id,
      name: body.name,
      description: body.description,
      category: body.category,
      price: Number(body.price),
      location: body.location,
      
      // Image handling (array of objects with url)
      images: files.images?.map(file => ({
        url: `/uploads/service-images/${file.filename}`
      })) || [],
    
      // Portfolio handling (array of objects with url)
      portfolio: files.portfolio?.map(file => ({
        url: `/uploads/service-images/${file.filename}`
      })) || [],
    
      // Common fields
      cuisineType: body.cuisineType,
      menuItems: body.menuItems,
      serviceType: body.serviceType,
      minGuests: Number(body.minGuests) || undefined,
      maxGuests: Number(body.maxGuests) || undefined,
      availabilityDates: body.availabilityDates,
      additionalServices: parseArrayField(body.additionalServices),
      customizationOptions: body.customizationOptions,
      termsConditions: body.termsConditions,
    
      // Photography-specific fields
      photographyType: body.photographyType,
      packageDetails: body.packageDetails,
      numPhotographers: Number(body.numPhotographers) || undefined,
      coverageDuration: Number(body.coverageDuration) || undefined,
      albumEditing: body.albumEditing,
      deliveryTime: body.deliveryTime,
      additionalPhotographyServices: parseArrayField(body.additionalPhotographyServices),
    
      // Venue-specific fields
      capacityMin: Number(body.capacityMin) || undefined,
      capacityMax: Number(body.capacityMax) || undefined,
      hallTypes: parseArrayField(body.hallTypes),
      pricingStructure: body.pricingStructure,
      availablePackages: body.availablePackages,
      decorServices: body.decorServices,
      cateringIncluded: body.cateringIncluded,
      parkingAvailability: body.parkingAvailability,
      facilities: body.facilities,
    
      // Car-specific fields
      carModel: body.carModel,
      carType: body.carType,
      seatingCapacity: Number(body.seatingCapacity) || undefined,
      fuelDriverIncluded: body.fuelDriverIncluded,
      additionalCarServices: parseArrayField(body.additionalCarServices),
      pickupDropoff: body.pickupDropoff
    };

    const service = new Service(serviceData);
    await service.save();

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (err) {
    // Enhanced error cleanup
    if (req.files) {
      Object.values(req.files).forEach(fieldFiles => {
        fieldFiles.forEach(file => {
          fs.unlink(file.path, err => {
            if (err) console.error(`Error deleting ${file.filename}:`, err);
          });
        });
      });
    }

    res.status(400).json({
      success: false,
      message: err.message.includes('validation failed') 
        ? 'Missing required fields' 
        : err.message
    });
  }
});

// Error handling middleware for Multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next(err);
});

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({})
    .populate({path: 'vendor',
      select: 'isApproved businessName',
      model: 'Vendor'});;
    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// Get services by vendor
router.get('/vendor', verifyToken, async (req, res) => {
  try {
    const services = await Service.find({ vendor: req.vendor.id });
    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});
// Add this route to your services routes file (services.js)
router.get('/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID format'
      });
    }

    const service = await Service.findById(req.params.id)
      .populate('vendor', 'name email phone'); // Populate vendor details if needed

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;