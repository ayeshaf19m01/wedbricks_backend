const Review = require('../models/Review');

const submitReview = async (req, res) => {
  try {
    const { rating, comment, vendorId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!vendorId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 1 and 5'
      });
    }

    // Check if review already exists for the vendor
    const existingReview = await Review.findOne({ vendor: vendorId, user: userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a review for this vendor'
      });
    }

    // Create new review
    const review = new Review({
      rating,
      comment: comment || '',
      user: userId,
      vendor: vendorId,
    });

    await review.save();

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    console.error('Review submission error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
const getReviewsByVendor = async (req, res) => {
  try {
    const reviews = await Review.find({ vendor: req.params.vendorId })
      .populate({ path: 'user',
        select: 'fullName',})
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  submitReview,
  getReviewsByVendor
};
