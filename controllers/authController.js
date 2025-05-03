const User = require('../models/User');
const Vendor = require('../models/Vendor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Helper: Generate JWT token
const generateToken = (user, role) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: role || user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Helper: Send response
const sendResponse = (res, status, success, message, data = null) => {
  return res.status(status).json({ success, message, ...(data && { data }) });
};

// ==================== USER AUTH ==================== //

// Register User
exports.userSignup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', { errors: errors.array() });
    }

    const { fullName, email, password, phoneNumber, weddingDate } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return sendResponse(res, 409, false, 'User already exists');

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      weddingDate,
    });

    const token = generateToken(newUser, 'user');

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        weddingDate: newUser.weddingDate
      }
    });

  } catch (error) {
    console.error('User signup error:', error);
    return sendResponse(res, 500, false, 'Internal server error');
  }
};

// Login User
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    const token = generateToken(user, 'user');

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        weddingDate: user.weddingDate
      }
    });

  } catch (error) {
    console.error('User login error:', error);
    return sendResponse(res, 500, false, 'Internal server error');
  }
};

// ==================== VENDOR AUTH ==================== //

// Register Vendor
exports.vendorSignup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { businessName, ownerName, email, phone, password, service, description } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if vendor exists
    const existingVendor = await Vendor.findOne({ email: normalizedEmail });
    if (existingVendor) {
      return res.status(409).json({ 
        success: false, 
        message: 'Vendor already exists' 
      });
    }

    // Create new vendor (without manually hashing the password)
    const newVendor = new Vendor({
      businessName,
      ownerName,
      email: normalizedEmail,
      phone,
      password, // Use the plain password - the pre-save hook will hash it
      service,
      description,
      logo: req.file ? req.file.path : undefined
    });

    await newVendor.save();

    // Generate token
    const token = jwt.sign(
      { id: newVendor._id, email: newVendor.email, role: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return response without password
    const vendorResponse = newVendor.toObject();
    delete vendorResponse.password;

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully',
      token,
      vendor: vendorResponse
    });

  } catch (error) {
    console.error('Vendor signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed',
      error: error.message 
    });
  }
};

// Login Vendor
exports.vendorLogin = async (req, res) => {
  try {
    
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();

    // Find vendor
    const vendor = await Vendor.findOne({ email: normalizedEmail }).select('+password');
    
    if (!vendor) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: vendor._id, email: vendor.email, role: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return response without password
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      vendor: vendorResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get Vendor Profile
exports.getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id).select('-password');
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor profile retrieved',
      vendor
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Update Vendor Profile
exports.updateVendorProfile = async (req, res) => {
  try {
    const { businessName, ownerName, phone, service, description } = req.body;
    const updateData = {
      businessName,
      ownerName,
      phone,
      service,
      description
    };

    if (req.file) {
      updateData.logo = req.file.path;
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      updateData,
      { new: true, runValidators: true }
    );

    updatedVendor.password = undefined;

    return res.status(200).json({
      success: true,
      message: 'Vendor profile updated successfully',
      vendor: updatedVendor
    });

  } catch (error) {
    console.error('Update vendor profile error:', error);
    return sendResponse(res, 500, false, 'Internal server error');
  }
};
exports.protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) throw new Error('No token provided');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check both collections
    const entity = await User.findById(decoded.id) || 
                   await Vendor.findById(decoded.id);
    
    if (!entity) throw new Error('Account not found');
    
    // Standardized request attachment
    if (entity instanceof User) {
      req.user = entity;
    } else {
      req.vendor = entity;
    }
    
    next();
  } catch (error) {
    const statusCode = error.message.includes('expired') ? 401 : 403;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

// Add restrictTo middleware if you need role-based access
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

exports.vendorAuth = async (req, res, next) => { // Make it async!
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (!token) throw new Error('No token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check role first
    if (decoded.role !== 'vendor') {
      return res.status(403).json({ message: 'Vendor access required' });
    }
    
    // Verify vendor exists
    const vendor = await Vendor.findById(decoded.id);
    if (!vendor) throw new Error('Vendor not found');
    
    req.vendor = vendor; // Standardized attachment
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message.includes('expired') 
        ? 'Session expired' 
        : 'Authentication failed'
    });
  }
};