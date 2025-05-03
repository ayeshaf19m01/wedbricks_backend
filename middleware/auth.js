const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const User = require('../models/User');

const sendErrorResponse = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

const verifyAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Access denied');

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(400).send('Invalid token');
  }
};

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please log in.'
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is a vendor
    if (decoded.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Vendor access required.'
      });
    }
    
    // Find vendor
    const vendor = await Vendor.findById(decoded.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found.'
      });
    }
    
    // Set vendor on request object
    req.vendor = {
      id: vendor._id,
      email: vendor.email,
      role: vendor.role
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

const verifyUserToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please log in.'
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
      // Verify user role from database
    if (user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User access required'
      });
    }
    
    // Set user on request object
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    const entity = req.user || req.vendor || req.admin;
    if (!entity || !roles.includes(entity.role)) {
      return sendErrorResponse(
        res,
        403,
        'You do not have permission to perform this action'
      );
    }
    next();
  };
};

// Enhanced version that works for both users and vendors
const authenticate = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(); // No token, continue without authentication
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a vendor or user token
    if (decoded.role === 'vendor') {
      const vendor = await Vendor.findById(decoded.id).select('-password');
      if (!vendor) {
        return next();
      }
      req.vendor = vendor;
    } else {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next();
      }
      req.user = user;
    }

    next();
  } catch (err) {
    console.error('Authentication error:', err);
    next();
  }
};

module.exports = {
  verifyAdmin ,
  verifyToken,
  verifyUserToken,
  restrictTo,
  authenticate,
  auth: verifyToken
};