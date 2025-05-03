const express = require('express');
const router = express.Router();
const { verifyUserToken } = require('../middleware/auth');
const { submitReview, getReviewsByVendor } = require('../controllers/reviewController');

// Submit review
router.post('/', verifyUserToken, submitReview);

// Get reviews for vendor
router.get('/:vendorId', getReviewsByVendor);

module.exports = router;