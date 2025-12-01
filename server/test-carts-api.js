const mongoose = require('mongoose');
const Cart = require('./models/Cart');
const User = require('./models/User');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

async function testCartsForUser() {
    try {
        // Get sahil user
        const sahil = await User.findOne({ email: 'sahil@gmail.com' });
        if (!sahil) {
            console.log('❌ Sahil user not found!');
            process.exit(1);
            return;
        }

        console.log('═'.repeat(60));
        console.log(`Testing carts visible to: ${sahil.name} (${sahil.email})`);
        console.log('═'.repeat(60));

        // Query that the API uses
        const query = {
            status: { $in: ['active', 'full'] },
            isPublic: true,
            expiresAt: { $gt: new Date() },
            creator: { $ne: sahil._id }
        };

        const carts = await Cart.find(query)
            .populate('creator', 'name email')
            .limit(20);

        console.log(`\n✅ Found ${carts.length} carts\n`);

        if (carts.length === 0) {
            console.log('❌ No carts match the query!');
            console.log('\nChecking why...\n');

            const allPublic = await Cart.find({ isPublic: true, status: 'active' }).count();
            console.log(`Total public active carts: ${allPublic}`);

            const notExpired = await Cart.find({ 
                isPublic: true, 
                status: 'active',
                expiresAt: { $gt: new Date() }
            }).count();
            console.log(`Not expired: ${notExpired}`);

            const notByUser = await Cart.find({ 
                isPublic: true, 
                status: 'active',
                expiresAt: { $gt: new Date() },
                creator: { $ne: sahil._id }
            }).count();
            console.log(`Not created by this user: ${notByUser}`);

        } else {
            carts.slice(0, 5).forEach(cart => {
                console.log(`📦 ${cart.platform.toUpperCase()} - ₹${cart.deliveryCharge}`);
                console.log(`   Creator: ${cart.creator?.name}`);
                console.log(`   Location: ${cart.location.city}`);
                console.log(`   Expires: ${cart.expiresAt}`);
                console.log('');
            });
        }

        console.log('═'.repeat(60) + '\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testCartsForUser();
