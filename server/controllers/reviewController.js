const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res, next) => {
  try {
    const { orderId, revieweeId, rating, comment, categories, isAnonymous } = req.body;

    // Check if order exists
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user was part of the order
    const isMember = order.members.some(
      m => m.user.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You were not part of this order'
      });
    }

    // Check if reviewee was part of the order
    const revieweeWasMember = order.members.some(
      m => m.user.toString() === revieweeId
    );

    if (!revieweeWasMember) {
      return res.status(400).json({
        success: false,
        message: 'Reviewee was not part of this order'
      });
    }

    // Cannot review yourself
    if (req.user.id === revieweeId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot review yourself'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      order: orderId,
      reviewer: req.user.id,
      reviewee: revieweeId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this user for this order'
      });
    }

    // Create review
    const review = await Review.create({
      order: orderId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating: rating,
      comment: comment,
      categories: categories,
      isAnonymous: isAnonymous || false
    });

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar rating');

    res.status(201).json({
      success: true,
      data: populatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Public
exports.getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      reviewee: req.params.userId,
      isReported: false
    })
      .populate('reviewer', 'name avatar')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(50);

    // Format reviews for response
    const formattedReviews = reviews.map(review => {
      const reviewObj = review.toObject();
      
      // Calculate overall rating from categories if not present
      if (!reviewObj.rating && reviewObj.categories) {
        reviewObj.overallRating = (
          reviewObj.categories.punctuality +
          reviewObj.categories.communication +
          reviewObj.categories.reliability
        ) / 3;
      } else {
        reviewObj.overallRating = reviewObj.rating;
      }

      // Add individual category ratings
      reviewObj.punctuality = reviewObj.categories?.punctuality || 5;
      reviewObj.communication = reviewObj.categories?.communication || 5;
      reviewObj.reliability = reviewObj.categories?.reliability || 5;

      // Handle anonymous reviews
      if (reviewObj.isAnonymous) {
        reviewObj.reviewer = {
          name: 'Anonymous',
          avatar: 'https://ui-avatars.com/api/?name=A&background=cccccc'
        };
        reviewObj.anonymous = true;
      }

      return reviewObj;
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: formattedReviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get reviews by current user
// @route   GET /api/reviews/my
// @access  Private
exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      reviewer: req.user.id
    })
      .populate('reviewee', 'name avatar rating')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the reviewer
    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const { rating, comment, categories } = req.body;

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.categories = categories || review.categories;

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar rating');

    res.status(200).json({
      success: true,
      data: populatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the reviewer
    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await review.deleteOne();

    // Recalculate reviewee's rating
    const User = require('../models/User');
    const stats = await Review.aggregate([
      { $match: { reviewee: review.reviewee } },
      {
        $group: {
          _id: '$reviewee',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(review.reviewee, {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        reviewCount: stats[0].count
      });
    } else {
      await User.findByIdAndUpdate(review.reviewee, {
        rating: 5.0,
        reviewCount: 0
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
exports.reportReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isReported = true;
    review.reportReason = req.body.reason;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pending reviews for user (orders they haven't reviewed yet)
// @route   GET /api/reviews/pending
// @access  Private
exports.getPendingReviews = async (req, res, next) => {
  try {
    // Get completed orders where user was a member
    const completedOrders = await Order.find({
      'members.user': req.user.id,
      status: 'delivered'
    }).populate('members.user', 'name avatar');

    // For each order, find members that user hasn't reviewed yet
    const pendingReviews = [];

    for (const order of completedOrders) {
      for (const member of order.members) {
        // Skip self
        if (member.user._id.toString() === req.user.id) continue;

        // Check if review exists
        const existingReview = await Review.findOne({
          order: order._id,
          reviewer: req.user.id,
          reviewee: member.user._id
        });

        if (!existingReview) {
          pendingReviews.push({
            order: {
              _id: order._id,
              orderNumber: order.orderNumber
            },
            user: member.user
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      count: pendingReviews.length,
      data: pendingReviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
