const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['catering', 'photography', 'venue', 'car', 'other']
  },
  price: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  images: [String], // Array of strings
  portfolioUrls: [String],
  images: [{
    url: {
      type: String,
      required: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true // Ensure new services are visible by default
  },
  cuisineType: String,
  menuItems: String,
  serviceType: String,
  minGuests: Number,
  maxGuests: Number,
  availabilityDates: String,
  additionalServices: [String],
  customizationOptions: String,
  termsConditions: String,
  photographyType: String,
  packageDetails: String,
  numPhotographers: Number,
  coverageDuration: Number,
  albumEditing: String,
  deliveryTime: String,
  portfolio: [{
    url: String
  }],
  additionalPhotographyServices: [String],
  capacityMin: Number,
  capacityMax: Number,
  hallTypes: [String],
  pricingStructure: String,
  availablePackages: String,
  decorServices: String,
  cateringIncluded: String,
  parkingAvailability: String,
  facilities: String,
  carModel: String,
  carType: String,
  seatingCapacity: Number,
  fuelDriverIncluded: String,
  additionalCarServices: [String],
  pickupDropoff: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Service', ServiceSchema);