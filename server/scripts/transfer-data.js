require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Message = require('../models/Message');
const Review = require('../models/Review');

const transferData = async () => {
  try {
    console.log('\n==================================================');
    console.log('   Data Transfer: Local MongoDB → Atlas');
    console.log('==================================================\n');

    // Connect to LOCAL MongoDB
    console.log('🔄 Connecting to LOCAL MongoDB...');
    const localConnection = await mongoose.createConnection('mongodb://localhost:27017/sharecart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to LOCAL MongoDB\n');

    // Create models for local connection
    const LocalUser = localConnection.model('User', User.schema);
    const LocalCart = localConnection.model('Cart', Cart.schema);
    const LocalOrder = localConnection.model('Order', Order.schema);
    const LocalMessage = localConnection.model('Message', Message.schema);
    const LocalReview = localConnection.model('Review', Review.schema);

    // Connect to ATLAS MongoDB
    console.log('🔄 Connecting to ATLAS MongoDB...');
    const atlasConnection = await mongoose.createConnection(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to ATLAS MongoDB\n');

    // Create models for atlas connection
    const AtlasUser = atlasConnection.model('User', User.schema);
    const AtlasCart = atlasConnection.model('Cart', Cart.schema);
    const AtlasOrder = atlasConnection.model('Order', Order.schema);
    const AtlasMessage = atlasConnection.model('Message', Message.schema);
    const AtlasReview = atlasConnection.model('Review', Review.schema);

    console.log('📊 Reading data from LOCAL MongoDB...\n');

    // Read data from local
    const localUsers = await LocalUser.find({}).select('+password').lean();
    const localCarts = await LocalCart.find({}).lean();
    const localOrders = await LocalOrder.find({}).lean();
    const localMessages = await LocalMessage.find({}).lean();
    const localReviews = await LocalReview.find({}).lean();

    console.log('Collection     Local Docs');
    console.log('──────────────────────────────');
    console.log(`Users          ${localUsers.length}`);
    console.log(`Carts          ${localCarts.length}`);
    console.log(`Orders         ${localOrders.length}`);
    console.log(`Messages       ${localMessages.length}`);
    console.log(`Reviews        ${localReviews.length}`);
    console.log('');

    if (localUsers.length === 0 && localCarts.length === 0 && localOrders.length === 0) {
      console.log('⚠️  No data found in local MongoDB!');
      console.log('💡 Local database appears to be empty.\n');
      await localConnection.close();
      await atlasConnection.close();
      return;
    }

    console.log('🔄 Transferring data to ATLAS...\n');

    // Transfer Users using native collection API to bypass mongoose validation
    if (localUsers.length > 0) {
      const usersToInsert = localUsers.map(user => {
        const { _id, __v, ...rest } = user;
        // Ensure password field exists
        if (!rest.password && user.password) {
          rest.password = user.password;
        }
        return rest;
      });
      
      // Use native MongoDB collection API to bypass validation
      const usersCollection = atlasConnection.collection('users');
      const result = await usersCollection.insertMany(usersToInsert, { ordered: false });
      console.log(`✅ Transferred ${result.insertedCount} users`);
    }

    // Transfer Carts
    if (localCarts.length > 0) {
      const cartsToInsert = localCarts.map(cart => {
        const { _id, __v, ...rest } = cart;
        return rest;
      });
      await AtlasCart.insertMany(cartsToInsert, { ordered: false });
      console.log(`✅ Transferred ${localCarts.length} carts`);
    }

    // Transfer Orders
    if (localOrders.length > 0) {
      const ordersToInsert = localOrders.map(order => {
        const { _id, __v, ...rest } = order;
        return rest;
      });
      await AtlasOrder.insertMany(ordersToInsert, { ordered: false });
      console.log(`✅ Transferred ${localOrders.length} orders`);
    }

    // Transfer Messages
    if (localMessages.length > 0) {
      const messagesToInsert = localMessages.map(message => {
        const { _id, __v, ...rest } = message;
        return rest;
      });
      await AtlasMessage.insertMany(messagesToInsert, { ordered: false });
      console.log(`✅ Transferred ${localMessages.length} messages`);
    }

    // Transfer Reviews
    if (localReviews.length > 0) {
      const reviewsToInsert = localReviews.map(review => {
        const { _id, __v, ...rest } = review;
        return rest;
      });
      await AtlasReview.insertMany(reviewsToInsert, { ordered: false });
      console.log(`✅ Transferred ${localReviews.length} reviews`);
    }

    console.log('\n✨ Data transfer complete!\n');

    // Verify transferred data
    console.log('🔍 Verifying transferred data...\n');
    const atlasUserCount = await AtlasUser.countDocuments();
    const atlasCartCount = await AtlasCart.countDocuments();
    const atlasOrderCount = await AtlasOrder.countDocuments();
    const atlasMessageCount = await AtlasMessage.countDocuments();
    const atlasReviewCount = await AtlasReview.countDocuments();

    console.log('Collection     Atlas Docs');
    console.log('──────────────────────────────');
    console.log(`Users          ${atlasUserCount}`);
    console.log(`Carts          ${atlasCartCount}`);
    console.log(`Orders         ${atlasOrderCount}`);
    console.log(`Messages       ${atlasMessageCount}`);
    console.log(`Reviews        ${atlasReviewCount}`);
    console.log('');

    // Close connections
    await localConnection.close();
    await atlasConnection.close();
    
    console.log('🔌 Connections closed\n');
    console.log('✅ Data transfer successful! Your MongoDB Atlas is now populated.\n');

  } catch (error) {
    console.error('❌ Error during data transfer:', error.message);
    
    if (error.message.includes('ECONNREFUSED') && error.message.includes('127.0.0.1:27017')) {
      console.error('\n⚠️  Local MongoDB is not running!');
      console.error('💡 Start MongoDB locally first: mongod or start MongoDB service\n');
    } else if (error.code === 11000) {
      console.error('\n⚠️  Duplicate key error - some data already exists in Atlas');
      console.error('💡 This is normal if you\'re running the script again\n');
    } else {
      console.error('\nFull error:', error);
    }
    process.exit(1);
  }
};

transferData();
