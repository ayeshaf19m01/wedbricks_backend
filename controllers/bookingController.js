// controllers/bookingController.js
const Notification = require('../models/Notification');
const socket = require('../socket/index');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

exports.createBooking = async (req, res) => {
  try {
    const { serviceId, bookingDate, notes } = req.body;

    if (!serviceId || !bookingDate) {
      return res.status(400).json({ message: 'Service ID and booking date are required' });
    }

    // (optionally check service exists)
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const booking = new Booking({
      user: req.user.id,
      service: serviceId,
      bookingDate: new Date(bookingDate),
      notes: notes || '',
      status: 'pending'
    });
    await booking.save();
   // Create notification for vendor
   const notification = new Notification({
    senderId: req.user.id,
    receiverId: service.vendor,
    type: 'booking',
    message: 'New booking request received',
    link: `/vendor/bookings/${booking._id}`
  });
  await notification.save();

  // Send real-time notification via socket
  socket.getIO().to(service.vendor.id.toString()).emit('newNotification', {
    _id: notification._id,
    message: notification.message,
    link: notification.link,
    createdAt: new Date(),
    isRead: false
  });
    const populatedBooking = await Booking
      .findById(booking._id)
      .populate('service')
      .populate('vendor', 'name email');

    res.status(201).json({ success: true, booking: populatedBooking });
  } 
  catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
