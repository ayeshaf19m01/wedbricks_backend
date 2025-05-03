// controllers/userController.js
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// Get user profile
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password -__v -createdAt -updatedAt')
    .lean();

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({ success: true, data: user });
});

// Update user profile
exports.updateUserProfile = asyncHandler(async (req, res) => {
  console.log('Incoming update data:', req.body); // Debugging log

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Update fields
  if (req.body.fullName) user.fullName = req.body.fullName;
  if (req.body.phoneNumber) user.phoneNumber = req.body.phoneNumber;
  if (req.body.weddingDate) user.weddingDate = req.body.weddingDate;

  console.log('Modified user:', user); // Debugging log

  try {
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      data: updatedUser.toObject({ getters: true, virtuals: false })
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors
    });
  }
});

// Upload profile picture
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const avatarPath = `/uploads/user-avatars/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.id, { avatar: avatarPath });

  res.status(200).json({ 
    success: true, 
    data: {
      avatar: avatarPath
    }
  });
});