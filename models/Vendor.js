const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vendorSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true, select: false },
  // service: { type: String, required: true },
  designation: String,
  portfolio: [String],
  services: [String],
  contact: {
    address: String,
    phone: String,
    email: String,
    website: String,
    availability: String,
    experience: String
  },
  description: { type: String },
  logo: { type: String },
  role: { type: String, default: 'vendor' },
  createdAt: { type: Date, default: Date.now },
  resetToken: String,
  resetExpires: Date,
  isApproved: { type: Boolean, default: false }, // False until approved by admin
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, // ID of admin who approved
  approvedAt: { type: Date },
});
vendorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// // Email normalization middleware
vendorSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});
module.exports = mongoose.model('Vendor', vendorSchema);