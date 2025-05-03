// controllers/chatController.js
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const mongoose = require('mongoose');

exports.startChat = async (req, res) => {
  try {
    const { userId, vendorId } = req.body;
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || 
        !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Find or create chat
    const chat = await Chat.findOneAndUpdate(
      { userId, vendorId },
      { $setOnInsert: { userId, vendorId } },
      { new: true, upsert: true }
    ).populate('vendorId', 'ownerName');

    res.json(chat);
  } catch (err) {
    console.error('startChat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// New: Get user's chats
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const chats = await Chat.find({ userId })
      .populate('vendorId', 'ownerName')
      .sort({ updatedAt: -1 });

    // Add last message to each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 })
          .select('content createdAt');
        
        return {
          ...chat.toObject(),
          lastMessage: lastMessage?.content || null,
          lastMessageDate: lastMessage?.createdAt || chat.createdAt
        };
      })
    );

    res.json(chatsWithLastMessage);
  } catch (err) {
    console.error('getUserChats error:', err);
    res.status(500).json({ error: 'Failed to load user chats' });
  }
};

// New: Get vendor's chats
exports.getVendorChats = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ error: 'Invalid vendor ID' });
    }

    const chats = await Chat.find({ vendorId })
      .populate('userId', 'fullName email')
      .sort({ updatedAt: -1 });

    // Add last message to each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 })
          .select('content createdAt');
        
        return {
          ...chat.toObject(),
          lastMessage: lastMessage?.content || null,
          lastMessageDate: lastMessage?.createdAt || chat.createdAt
        };
      })
    );

    res.json(chatsWithLastMessage);
  } catch (err) {
    console.error('getVendorChats error:', err);
    res.status(500).json({ error: 'Failed to load vendor chats' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 })
      .select('sender content createdAt read');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.saveMessage = async (req, res) => {
  try {
    const { sender, content, receiver } = req.body;

       // Validate required fields
       if (!sender || !receiver || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
    
    // Update chat's last activity
    await Chat.findByIdAndUpdate(
      req.params.chatId,
      { $set: { updatedAt: new Date() } }
    );

    const message = await Message.create({
      chatId: req.params.chatId,
      sender,
      receiver, // Add this line to save the receiver
      content,
      read: false
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Message.updateMany(
      { 
        chatId: req.params.chatId,
        sender: { $ne: req.body.userId } // Only mark others' messages as read
      },
      { $set: { read: true } }
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};