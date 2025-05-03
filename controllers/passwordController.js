const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Configure allowed user types and email settings
const ALLOWED_USER_TYPES = ['user', 'admin', 'vendor']; // Add other types as needed
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.requestReset = async (req, res) => {
  try {
    const { email, userType } = req.body;

    // Validate user type
    if (!ALLOWED_USER_TYPES.includes(userType.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Dynamically load user model
    const modelPath = `../models/${userType.charAt(0).toUpperCase() + userType.slice(1)}`;
    const User = require(modelPath);

    // Generate secure token and hash
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = Date.now() + 3600000; // 1 hour

    // Update user with hashed token
    const user = await User.findOneAndUpdate(
      { email },
      { resetToken: resetTokenHash, resetExpires },
      { new: true }
    );

    if (!user) return res.status(200).json({ message: 'If the email exists, a reset link will be sent' });

    // Create secure reset URL
  
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''); // Remove trailing slash
const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}&id=${userType}`; // Use 'id' instead of 'type'
console.log('Generated Reset URL:', resetUrl); // Debug log
    // Send email with reset link
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `Use this link to reset your password: ${resetUrl}`,
      html: `
        <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
        <p><small>This link expires in 1 hour.</small></p>
      `
    });

    res.status(200).json({ message: 'Reset link sent to email' });
  } catch (error) {
    console.error('Reset request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.validateToken = async (req, res) => {
  try {
    const { token, userType } = req.body;

    if (!ALLOWED_USER_TYPES.includes(userType.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    const User = require(`../models/${userType.charAt(0).toUpperCase() + userType.slice(1)}`);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetToken: tokenHash,
      resetExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    
    res.status(200).json({ message: 'Valid token' });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { token, newPassword, userType } = req.body;

    if (!ALLOWED_USER_TYPES.includes(userType.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    const User = require(`../models/${userType.charAt(0).toUpperCase() + userType.slice(1)}`);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetToken: tokenHash,
      resetExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // Update password and clear reset fields
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};