// socket/index.js
const { Server } = require('socket.io');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

let io;

const socketHandler = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }
  });

  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('📡 Socket connected:', socket.id);

    socket.on('registerUser', (userId) => {
      socket.join(`user_${userId}`);
      onlineUsers.set(userId, socket.id);
      console.log(`✅ User registered: ${userId}`);
    });

    socket.on('joinRoom', ({ chatId }) => {
      socket.join(chatId);
      console.log(`👥 Joined chat room: ${chatId}`);
    });

    socket.on('sendMessage', async ({ chatId, message, senderId, vendorId }) => {
      try {
        // Create and save message with receiver info
        const newMessage = new Message({
          chatId,
          sender: senderId,
          receiver: vendorId,  // Track receiver for unread status
          content: message,
          read: false
        });
        await newMessage.save();

        // Get unread count for receiver
        const unreadCount = await Message.countDocuments({
          receiver: vendorId,
          read: false
        });

        // Notify chat room and update unread counts
        io.to(chatId).emit('receiveMessage', newMessage);
        io.to(`user_${vendorId}`).emit('unreadUpdate', unreadCount);
        io.to(`vendor_${vendorId}`).emit('unreadUpdate', unreadCount);

        // Existing notification logic
        const notification = new Notification({
          senderId: senderId,
          senderModel: 'User',
          receiverId: vendorId,
          receiverModel: 'Vendor',
          type: 'message',
          message: 'New message received',
          link: '/vendor-chats'
               });
        await notification.save();

        const receiverSocketId = onlineUsers.get(vendorId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newNotification', notification);
        }
      } catch (err) {
        console.error('❌ Error handling message:', err);
      }
    });

    // Add markSeen handler for read receipts
    socket.on('markSeen', async ({ chatId, userId }) => {
      try {
        // Mark messages as read
        await Message.updateMany(
          { chatId, receiver: userId },
          { $set: { read: true } }
        );

        // Get updated unread count
        const unreadCount = await Message.countDocuments({
          receiver: userId,
          read: false
        });

        // Broadcast updated count
        io.to(`user_${userId}`).emit('unreadUpdate', unreadCount);
        io.to(`vendor_${userId}`).emit('unreadUpdate', unreadCount);
      } catch (err) {
        console.error('❌ Error marking messages as read:', err);
      }
    });

    // Handle booking notifications...
    socket.on('bookingCancelledByVendor', async ({ vendorId, userId, bookingId }) => {
      try {
        const notification = new Notification({
          senderId: vendorId,
          receiverId: userId,
          type: 'booking_cancelled',
          message: 'Booking cancelled by vendor',
          link: `/bookings/${bookingId}`
        });
        await notification.save();

        const userSocketId = onlineUsers.get(userId);
        if (userSocketId) io.to(userSocketId).emit('newNotification', notification);
      } catch (err) {
        console.error('❌ Error handling vendor cancellation:', err);
      }
    });

    socket.on('bookingCreated', async ({ userId, vendorId, bookingId }) => {
      try {
        const notification = new Notification({
          senderId: userId,
          receiverId: vendorId,
          type: 'booking',
          message: 'New booking request',
          link: `/vendor/bookings/${bookingId}`
        });
        await notification.save();

        const vendorSocketId = onlineUsers.get(vendorId);
        if (vendorSocketId) io.to(vendorSocketId).emit('newNotification', notification);
      } catch (err) {
        console.error('❌ Error handling booking notification:', err);
      }
    });

    socket.on('registerVendor', (vendorId) => {
      socket.join(`vendor_${vendorId}`);
      console.log(`Vendor registered: ${vendorId}`);
    });

    socket.on('bookingStatusChanged', async ({ bookingId, status, userId, vendorId }) => {
      try {
        // Emit to both the user and vendor
        io.to(`user_${userId}`).emit('bookingUpdated', { bookingId, status });
        io.to(`vendor_${vendorId}`).emit('bookingUpdated', { bookingId, status });
      } catch (err) {
        console.error('❌ Error handling booking status change:', err);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`❌ User disconnected: ${userId}`);
        }
      }
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  socketHandler,
  getIO
};
