const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  weddingDate: { type: Date },
  avatar: { type: String },
  role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  resetToken: String,
  resetExpires: Date,
});

module.exports = mongoose.model('User', userSchema);
