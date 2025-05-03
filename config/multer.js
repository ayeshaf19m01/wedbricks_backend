const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Updated to 20MB file size limit for all configurations
const FILE_SIZE_LIMIT = 20 * 1024 * 1024; // 20MB

// Vendor Logo Configuration
const vendorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/vendor-logos/';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// User Avatar Configuration
const userAvatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/user-avatars/';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Service Files Configuration (Updated to 20MB)
const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/service-images/';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `service-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Updated Service Upload Configuration with 20MB limit
const serviceUpload = multer({
  storage: serviceStorage,
  limits: {
    fileSize: FILE_SIZE_LIMIT, // 20MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    allowedTypes.includes(file.mimetype) 
      ? cb(null, true)
      : cb(new Error('Invalid file type. Only JPEG/PNG/GIF allowed (max 20MB)'));
  }
});

module.exports = {
  upload: multer({
    storage: vendorStorage,
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter: (req, file, cb) => {
      ['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Invalid vendor logo format (max 20MB)'));
    }
  }),
  
  uploadAvatar: multer({
    storage: userAvatarStorage,
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter: (req, file, cb) => {
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Invalid avatar format (max 20MB)'));
    }
  }),

  // Service Upload Middleware with updated error message
  serviceUpload: serviceUpload.fields([
    { name: 'images', maxCount: 6 },
    { name: 'portfolio', maxCount: 6 }
  ])
};