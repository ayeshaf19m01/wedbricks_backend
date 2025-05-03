const express = require('express');
const auth = require('../middleware/auth');
const {
  startChat,
  getUserChats, // Make sure these are properly defined
  getVendorChats, // in your controller file
  getMessages,
  saveMessage,
  markRead
} = require('../controllers/chatController');

const router = express.Router();

// Existing routes
router.post('/start', startChat);
router.get('/vendor/:vendorId', getVendorChats);
router.get('/user/:userId', getUserChats);
router.get('/:chatId/messages', getMessages);
router.post('/:chatId/message', saveMessage);
router.put('/:chatId/read', markRead);

module.exports = router;