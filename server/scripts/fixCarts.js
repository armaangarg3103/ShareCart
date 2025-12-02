const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected for migration');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Fix and validate carts
const fixCarts = async () => {
  try {
    console.log('\n🔍 Starting cart database migration...\n');

    // Get all carts
    const allCarts = await Cart.find({});
    console.log(`📊 Found ${allCarts.length} carts in database\n`);

    let fixed = 0;
    let deleted = 0;
    let skipped = 0;
    const errors = [];

    for (const cart of allCarts) {
      try {
        let needsUpdate = false;
        let shouldDelete = false;
        const cartId = cart._id;
        const updates = {};

        // Check if creator exists
        if (cart.creator) {
          const creatorExists = await User.findById(cart.creator);
          if (!creatorExists) {
            console.log(`⚠️  Cart ${cartId} has invalid creator - marking for deletion`);
            shouldDelete = true;
          }
        } else {
          console.log(`⚠️  Cart ${cartId} has no creator - marking for deletion`);
          shouldDelete = true;
        }

        // Check if cart is expired (more than 7 days old and not completed)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (cart.createdAt < sevenDaysAgo && !['completed', 'delivered'].includes(cart.status)) {
          console.log(`⚠️  Cart ${cartId} is expired (older than 7 days) - marking for deletion`);
          shouldDelete = true;
        }

        // Delete invalid/irrelevant carts
        if (shouldDelete) {
          await Cart.findByIdAndDelete(cartId);
          deleted++;
          console.log(`🗑️  Deleted cart ${cartId}\n`);
          continue;
        }

        // Fix platform field if missing or invalid
        if (!cart.platform || !['blinkit', 'zepto', 'swiggy', 'bigbasket'].includes(cart.platform.toLowerCase())) {
          updates.platform = 'blinkit'; // Default platform
          needsUpdate = true;
          console.log(`  - Setting default platform: blinkit`);
        }

        // Fix location fields
        if (!cart.location || !cart.location.coordinates || cart.location.coordinates.length !== 2) {
          // If no valid location, try to get from creator
          if (!shouldDelete) {
            const creator = await User.findById(cart.creator);
            if (creator && creator.location && creator.location.coordinates) {
              updates.location = {
                type: 'Point',
                coordinates: creator.location.coordinates,
                address: creator.location.address || 'Not specified',
                city: creator.location.city || 'Not specified',
                pincode: creator.location.pincode || '000000'
              };
              needsUpdate = true;
              console.log(`  - Fixed location from creator`);
            } else {
              // Set default location (Delhi)
              updates.location = {
                type: 'Point',
                coordinates: [77.1025, 28.7041],
                address: 'Not specified',
                city: 'Not specified',
                pincode: '000000'
              };
              needsUpdate = true;
              console.log(`  - Set default location`);
            }
          }
        } else {
          // Fix location sub-fields
          if (!cart.location.address || cart.location.address.trim() === '') {
            updates['location.address'] = 'Not specified';
            needsUpdate = true;
          }
          if (!cart.location.city || cart.location.city.trim() === '') {
            updates['location.city'] = 'Not specified';
            needsUpdate = true;
          }
          if (!cart.location.pincode || cart.location.pincode.trim() === '') {
            updates['location.pincode'] = '000000';
            needsUpdate = true;
          }
        }

        // Fix items array
        if (!cart.items || !Array.isArray(cart.items)) {
          updates.items = [];
          needsUpdate = true;
          console.log(`  - Initialized empty items array`);
        } else {
          // Fix individual items
          const fixedItems = cart.items.map(item => ({
            name: item.name || 'Unknown Item',
            quantity: item.quantity || 1,
            price: item.price || 0,
            image: item.image || '',
            category: item.category || ''
          }));
          
          if (JSON.stringify(fixedItems) !== JSON.stringify(cart.items)) {
            updates.items = fixedItems;
            needsUpdate = true;
            console.log(`  - Fixed items array structure`);
          }
        }

        // Fix deliveryCharge
        if (typeof cart.deliveryCharge !== 'number' || cart.deliveryCharge < 0) {
          updates.deliveryCharge = 50; // Default delivery charge
          needsUpdate = true;
          console.log(`  - Set default delivery charge: ₹50`);
        }

        // Fix maxMembers
        if (typeof cart.maxMembers !== 'number' || cart.maxMembers < 2 || cart.maxMembers > 10) {
          updates.maxMembers = 4;
          needsUpdate = true;
          console.log(`  - Set default maxMembers: 4`);
        }

        // Fix members array
        if (!cart.members || !Array.isArray(cart.members)) {
          updates.members = [{
            user: cart.creator,
            joinedAt: cart.createdAt || new Date(),
            status: 'joined',
            splitAmount: cart.deliveryCharge || 50
          }];
          needsUpdate = true;
          console.log(`  - Initialized members array with creator`);
        } else {
          // Ensure creator is in members
          const creatorInMembers = cart.members.some(m => m.user && m.user.toString() === cart.creator.toString());
          if (!creatorInMembers) {
            const newMembers = [...cart.members, {
              user: cart.creator,
              joinedAt: cart.createdAt || new Date(),
              status: 'joined',
              splitAmount: cart.deliveryCharge || 50
            }];
            updates.members = newMembers;
            needsUpdate = true;
            console.log(`  - Added creator to members array`);
          }

          // Recalculate split amounts
          const memberCount = (updates.members || cart.members).length;
          const splitAmount = Math.ceil((updates.deliveryCharge || cart.deliveryCharge || 50) / memberCount);
          const membersWithSplit = (updates.members || cart.members).map(m => ({
            ...m,
            splitAmount: splitAmount
          }));
          
          if (JSON.stringify(membersWithSplit) !== JSON.stringify(updates.members || cart.members)) {
            updates.members = membersWithSplit;
            needsUpdate = true;
            console.log(`  - Recalculated split amounts: ₹${splitAmount} per member`);
          }
        }

        // Fix status
        if (!cart.status || !['active', 'full', 'ordering', 'ordered', 'delivered', 'completed', 'cancelled'].includes(cart.status)) {
          updates.status = 'active';
          needsUpdate = true;
          console.log(`  - Set default status: active`);
        }

        // Fix isPublic
        if (typeof cart.isPublic !== 'boolean') {
          updates.isPublic = true;
          needsUpdate = true;
          console.log(`  - Set default isPublic: true`);
        }

        // Fix maxDistance
        if (typeof cart.maxDistance !== 'number' || cart.maxDistance < 0.5 || cart.maxDistance > 5) {
          updates.maxDistance = 2;
          needsUpdate = true;
          console.log(`  - Set default maxDistance: 2 km`);
        }

        // Fix chatEnabled
        if (typeof cart.chatEnabled !== 'boolean') {
          updates.chatEnabled = true;
          needsUpdate = true;
          console.log(`  - Set default chatEnabled: true`);
        }

        // Fix totalOrders
        if (typeof cart.totalOrders !== 'number') {
          updates.totalOrders = 0;
          needsUpdate = true;
          console.log(`  - Set default totalOrders: 0`);
        }

        // Fix expiresAt
        if (!cart.expiresAt || cart.expiresAt < new Date()) {
          updates.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
          needsUpdate = true;
          console.log(`  - Reset expiration to 2 hours from now`);
        }

        // Apply updates if needed
        if (needsUpdate) {
          await Cart.findByIdAndUpdate(cartId, updates, {
            new: true,
            runValidators: false // Skip validators for migration
          });
          fixed++;
          console.log(`✅ Fixed cart ${cartId}\n`);
        } else {
          skipped++;
          console.log(`✓ Cart ${cartId} is valid - skipped\n`);
        }

      } catch (error) {
        errors.push({ cartId: cart._id, error: error.message });
        console.error(`❌ Error processing cart ${cart._id}:`, error.message, '\n');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total carts processed: ${allCarts.length}`);
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`🗑️  Deleted: ${deleted}`);
    console.log(`✓ Skipped (valid): ${skipped}`);
    console.log(`❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ cartId, error }) => {
        console.log(`  - Cart ${cartId}: ${error}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');

    // Verify all carts
    const verifiedCarts = await Cart.find({});
    console.log(`✅ Final cart count in database: ${verifiedCarts.length}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await fixCarts();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { fixCarts, connectDB };
