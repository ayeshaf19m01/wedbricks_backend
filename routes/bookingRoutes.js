const express = require('express');
const router = express.Router();
// const auth = require('../middleware/auth');
const { verifyUserToken } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { createBooking } = require('../controllers/bookingController');
const verifyToken = require('../middleware/auth').verifyToken;
const Package = require('../models/Package');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// Correct route definition with proper handler function
router.post('/', verifyUserToken, async (req, res) => {
  try {
    const { serviceId, packageId, bookingDate, notes } = req.body;
    
    if (!serviceId && !packageId) {
      return res.status(400).json({ 
        success: false,
        message: 'Either Service ID or Package ID is required' 
      });
    }

    let vendor;
    let bookingData;

    if (packageId) {
      // Handle package booking
      const package = await Package.findById(packageId);
      if (!package) {
        return res.status(404).json({ 
          success: false,
          message: 'Package not found' 
        });
      }

      // Only check if the exact package is already booked
      const existingPackageBooking = await Booking.findOne({
        user: req.user.id,
        package: packageId
      });

      if (existingPackageBooking) {
        return res.status(409).json({
          success: false,
          message: 'You have already booked this package',
          booking: existingPackageBooking
        });
      }

      vendor = package.vendor;
      bookingData = {
        user: req.user.id,
        vendor: package.vendor,
        package: packageId,
        bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
        notes: notes || '',
        status: 'pending'
      };
    } else {
      // Handle service booking
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ 
          success: false,
          message: 'Service not found' 
        });
      }

      // Only check if the exact service is already booked
      const existingServiceBooking = await Booking.findOne({
        user: req.user.id,
        service: serviceId
      });

      if (existingServiceBooking) {
        return res.status(409).json({
          success: false,
          message: 'You have already booked this service',
          booking: existingServiceBooking
        });
      }

      vendor = service.vendor;
      bookingData = {
        user: req.user.id,
        vendor: service.vendor,
        service: serviceId,
        bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
        notes: notes || '',
        status: 'pending'
      };
    }

    const booking = new Booking(bookingData);
    await booking.save();
    
    const populatedBooking = await Booking.findById(booking._id)
      .populate('service')
      .populate('package')
      .populate('vendor', 'businessName email phone');

    // Create notification for vendor
    let notificationMessage = 'New booking request';

    if (bookingData.service) {
      const service = await Service.findById(bookingData.service);
      notificationMessage = `New booking request for service: ${service ? service.name : 'Unknown Service'}`;
    } else if (bookingData.package) {
      const package = await Package.findById(bookingData.package);
      notificationMessage = `New booking request for package: ${package ? package.name : 'Unknown Package'}`;
    }

    const notification = new Notification({
      senderId: req.user.id,
      senderModel: 'User',
      receiverId: vendor,
      receiverModel: 'Vendor',
      type: 'booking',
      message: notificationMessage,
      link: '/vendor-bookings'
    });
    await notification.save();

    // Emit socket event
    const io = getIO();
    io.to(`vendor_${vendor}`).emit('newNotification', {
      _id: notification._id,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
      isRead: false
    });

    res.status(201).json({
      success: true,
      booking: populatedBooking
    });

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Booking failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all bookings for a user
router.get('/', verifyUserToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('service', 'name description category price location imageUrl')
      .populate('package', 'name services originalPrice discountedPrice discount')
      .populate('vendor', 'businessName email phone')
      .sort({ createdAt: -1 });

    // Enhance the response with formatted data
    const formattedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      // Add a type field to easily identify if it's a service or package booking
      bookingObj.type = booking.package ? 'package' : 'service';
      
      // Add formatted date
      bookingObj.formattedDate = new Date(booking.bookingDate).toLocaleDateString();
      
      // Add price info
      bookingObj.price = booking.package ? 
        booking.package.discountedPrice : 
        (booking.service ? booking.service.price : 0);

      return bookingObj;
    });

    res.status(200).json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings
    });

  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all bookings for a vendor
router.get('/vendor-bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ vendor: req.vendor.id })
      .populate('user', 'fullName email phoneNumber')
      .populate({
        path: 'service',
        select: 'name description category price location imageUrl'
      })
      .populate({
        path: 'package',
        select: 'name services originalPrice discountedPrice discount'
      })
      .sort({ createdAt: -1 });

    // Enhance the response with formatted data
    const formattedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      // Add a type field to easily identify if it's a service or package booking
      bookingObj.type = booking.package ? 'package' : 'service';
      
      // Add formatted date
      bookingObj.formattedDate = new Date(booking.bookingDate).toLocaleDateString();
      
      // Add booking details based on type
      if (bookingObj.type === 'package') {
        bookingObj.name = booking.package?.name || 'Package Not Found';
        bookingObj.price = booking.package?.discountedPrice || 0;
        bookingObj.services = booking.package?.services || [];
      } else {
        bookingObj.name = booking.service?.name || 'Service Not Found';
        bookingObj.price = booking.service?.price || 0;
      }

      return bookingObj;
    });

    res.status(200).json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings
    });

  } catch (err) {
    console.error('Get vendor bookings error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor bookings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete a specific booking
router.delete('/:id', verifyUserToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you are not authorized to delete this booking'
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Confirm booking (vendor only)
router.patch('/confirm/:id', verifyToken, async (req, res) => {
  try {
    // Find booking and verify vendor ownership
    const booking = await Booking.findOne({
      _id: req.params.id,
      vendor: req.vendor.id,
      status: 'pending'
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you are not authorized to confirm this booking'
      });
    }

    // Update booking status to confirmed
    booking.status = 'confirmed';
    await booking.save();

    // Create notification for user
    const notification = new Notification({
      senderId: req.vendor.id,
      senderModel: 'Vendor',
      receiverId: booking.user,
      receiverModel: 'User',
      type: 'booking_confirmed',
      message: 'Your booking has been confirmed',
      link: '/my-bookings'
    });
    await notification.save();

    // Send real-time notification via socket
    const io = getIO();
    io.to(`user_${booking.user}`).emit('newNotification', {
      _id: notification._id,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
      isRead: false
    });

    // Return populated booking data
    const confirmedBooking = await Booking.findById(booking._id)
      .populate('user', 'fullName email phoneNumber')
      .populate('service', 'name price')
      .populate('package', 'name services originalPrice discountedPrice discount');

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: confirmedBooking
    });

  } catch (err) {
    console.error('Error confirming booking:', err);
    res.status(500).json({
      success: false,
      message: 'Error confirming booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Cancel booking (vendor only)
router.patch('/cancel/:id', verifyToken, async (req, res) => {
  try {
    // Find booking and verify vendor ownership
    const booking = await Booking.findOne({
      _id: req.params.id,
      vendor: req.vendor.id,
      status: { $in: ['pending', 'confirmed'] } // Can only cancel pending or confirmed bookings
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you are not authorized to cancel this booking'
      });
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    await booking.save();

    // Create notification for user
    const notification = new Notification({
      senderId: req.vendor.id,
      senderModel: 'Vendor',
      receiverId: booking.user,
      receiverModel: 'User',
      type: 'booking_cancelled',
      message: 'Your booking has been cancelled by the vendor',
      link: '/my-bookings'
    });
    await notification.save();

    // Send real-time notification via socket
    const io = getIO();
    io.to(`user_${booking.user}`).emit('newNotification', {
      _id: notification._id,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
      isRead: false
    });

    // Return populated booking data
    const cancelledBooking = await Booking.findById(booking._id)
      .populate('user', 'fullName email phoneNumber')
      .populate('service', 'name price')
      .populate('package', 'name services originalPrice discountedPrice discount')
      .populate('review') 
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: cancelledBooking
    });

  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;