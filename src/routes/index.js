const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const multer = require('multer');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Configure file upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/vendor-logos/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and GIF images are allowed!'));
    }
  }
});

// Common validation rules
const emailValidation = check('email')
  .isEmail()
  .withMessage('Please enter a valid email address')
  .normalizeEmail();

const passwordValidation = check('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

// User routes
router.post('/signup', [
  emailValidation,
  passwordValidation,
  check('fullName').not().isEmpty().withMessage('Full name is required'),
  check('phoneNumber').isMobilePhone().withMessage('Please enter a valid phone number')
], authController.userSignup);

router.post('/signin', [
  emailValidation,
  check('password').not().isEmpty().withMessage('Password is required')
], authController.userLogin);

// Vendor routes
router.post('/vendor/signup', upload.single('logo'), [
  emailValidation,
  passwordValidation,
  check('businessName').not().isEmpty().withMessage('Business name is required'),
  check('ownerName').not().isEmpty().withMessage('Owner name is required'),
  check('phone').isMobilePhone().withMessage('Please enter a valid phone number'),
  check('service').not().isEmpty().withMessage('Service type is required')
], authController.vendorSignup);

router.post('/vendor/signin', [
  emailValidation,
  check('password').not().isEmpty().withMessage('Password is required')
], authController.vendorLogin);

// Protected vendor routes
router.get('/vendor/profile', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('vendor'), 
  authController.getVendorProfile
);

router.put('/vendor/profile',
  authMiddleware.verifyToken,
  authMiddleware.restrictTo('vendor'),
  upload.single('logo'),
  authController.updateVendorProfile
);

module.exports = router;