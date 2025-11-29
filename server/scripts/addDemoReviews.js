const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sharecart', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const demoReviewComments = [
  "Great experience! Very punctual and easy to communicate with.",
  "Reliable person, would definitely order with again.",
  "Smooth transaction, highly recommended!",
  "Very cooperative and friendly. Made the whole process easy.",
  "Excellent communication throughout the order.",
  "On time delivery coordination. Very satisfied!",
  "Professional and trustworthy member of the group.",
  "Good experience overall, would collaborate again.",
  "Very responsible and kept everyone updated.",
  "Pleasant person to work with, highly reliable!"
];

async function addDemoReviews() {
  try {
    console.log('Starting to add demo reviews...');

    // Get all users
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    if (users.length < 2) {
      console.log('Need at least 2 users to create reviews');
      return;
    }

    // Create demo orders if they don't exist
    let demoOrders = await Order.find();
    
    if (demoOrders.length === 0) {
      console.log('Creating demo orders...');
      
      for (let i = 0; i < 3; i++) {
        const orderMembers = users.slice(0, Math.min(3, users.length)).map(user => ({
          user: user._id,
          items: [
            {
              name: `Item ${i + 1}`,
              price: 100 * (i + 1),
              quantity: 1
            }
          ],
          totalAmount: 100 * (i + 1),
          status: 'confirmed'
        }));

        const order = await Order.create({
          orderNumber: `ORD${Date.now()}${i}`,
          cart: null, // Can be null for demo
          members: orderMembers,
          totalAmount: orderMembers.reduce((sum, m) => sum + m.totalAmount, 0),
          deliveryCharge: 50,
          deliveryAddress: 'Demo Address',
          status: 'delivered',
          createdBy: users[0]._id
        });
        
        demoOrders.push(order);
        console.log(`Created demo order: ${order.orderNumber}`);
      }
    }

    console.log(`Using ${demoOrders.length} orders for reviews`);

    // Add reviews for each user
    let reviewsAdded = 0;

    for (const user of users) {
      console.log(`\nAdding reviews for: ${user.name} (${user.email})`);
      
      // Get current review count
      const existingReviews = await Review.find({ reviewee: user._id });
      console.log(`  Existing reviews: ${existingReviews.length}`);

      // Add 3-5 reviews per user
      const reviewsToAdd = Math.floor(Math.random() * 3) + 3; // 3-5 reviews
      
      for (let i = 0; i < reviewsToAdd; i++) {
        // Pick a random reviewer (not the same user)
        const otherUsers = users.filter(u => u._id.toString() !== user._id.toString());
        if (otherUsers.length === 0) continue;
        
        const reviewer = otherUsers[Math.floor(Math.random() * otherUsers.length)];
        const order = demoOrders[i % demoOrders.length];
        
        // Check if review already exists
        const existingReview = await Review.findOne({
          order: order._id,
          reviewer: reviewer._id,
          reviewee: user._id
        });

        if (existingReview) {
          console.log(`  Review already exists for order ${order.orderNumber}`);
          continue;
        }

        // Generate random ratings (mostly positive)
        const punctuality = Math.floor(Math.random() * 2) + 4; // 4-5
        const communication = Math.floor(Math.random() * 2) + 4; // 4-5
        const reliability = Math.floor(Math.random() * 2) + 4; // 4-5
        const overallRating = Math.round((punctuality + communication + reliability) / 3 * 10) / 10;

        const review = await Review.create({
          order: order._id,
          reviewer: reviewer._id,
          reviewee: user._id,
          rating: overallRating,
          comment: demoReviewComments[Math.floor(Math.random() * demoReviewComments.length)],
          categories: {
            punctuality,
            communication,
            reliability
          },
          isAnonymous: Math.random() > 0.7 // 30% anonymous
        });

        console.log(`  ✓ Added review from ${reviewer.name}: ${overallRating}⭐`);
        reviewsAdded++;
      }
    }

    console.log(`\n✅ Successfully added ${reviewsAdded} demo reviews!`);
    
    // Update all user ratings
    console.log('\nUpdating user ratings...');
    for (const user of users) {
      const userReviews = await Review.find({ reviewee: user._id });
      if (userReviews.length > 0) {
        const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
        const punctualityAvg = userReviews.reduce((sum, r) => sum + r.categories.punctuality, 0) / userReviews.length;
        const communicationAvg = userReviews.reduce((sum, r) => sum + r.categories.communication, 0) / userReviews.length;
        const reliabilityAvg = userReviews.reduce((sum, r) => sum + r.categories.reliability, 0) / userReviews.length;
        
        await User.findByIdAndUpdate(user._id, {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: userReviews.length,
          ratingBreakdown: {
            punctuality: Math.round(punctualityAvg * 10) / 10,
            communication: Math.round(communicationAvg * 10) / 10,
            reliability: Math.round(reliabilityAvg * 10) / 10
          }
        });
        
        console.log(`  Updated ${user.name}: ${Math.round(avgRating * 10) / 10}⭐ (${userReviews.length} reviews)`);
      }
    }

    console.log('\n✅ All done!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding demo reviews:', error);
    process.exit(1);
  }
}

addDemoReviews();
