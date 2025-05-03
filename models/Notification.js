// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'senderModel' // Dynamic reference
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'receiverModel' // Dynamic reference
  },
  senderModel: {
    type: String,
    enum: ['User', 'Vendor'],
    required: true // 👈 Must be required
  },
  receiverModel: {
    type: String,
    enum: ['User', 'Vendor'],
    required: true // 👈 Must be required
  },
  type: String, // e.g., "booking", "chat", "service_accepted"
  message: String,
  isRead: { type: Boolean, default: false },
  link: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
