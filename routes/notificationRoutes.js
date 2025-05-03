// routes/notifications.js
const express = require('express');
const Notification = require('../models/Notification');
const router = express.Router();

// Get notifications for a user/vendor
router.get('/:userId/:userType', async (req, res) => {
  try {
    const { userId, userType } = req.params;
    
    const notifications = await Notification.find({
      receiverId: userId,
      receiverModel: userType
    })
    .sort({ createdAt: -1 })
    .lean();

    console.log(`Fetching notifications for ${userType} ${userId}:`, notifications);
    
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notifications',
      error: err.message 
    });
  }
});

// Mark notification as read
router.put('/mark-read/:notificationId', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }
    
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Error marking notification as read',
      error: err.message 
    });
  }
});

module.exports = router;