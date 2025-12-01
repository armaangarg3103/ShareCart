const mongoose = require('mongoose');
const Cart = require('./models/Cart');
const User = require('./models/User');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

async function checkCarts() {
    try {
        const allCarts = await Cart.find().populate('creator', 'name email').lean();
        const publicCarts = await Cart.find({ isPublic: true, status: 'active' }).populate('creator', 'name email').lean();
        const allUsers = await User.find().select('name email').lean();
        
        console.log('═'.repeat(60));
        console.log('              DATABASE STATUS              ');
        console.log('═'.repeat(60));
        
        console.log(`\n📊 Total Users: ${allUsers.length}`);
        console.log(`📦 Total Carts: ${allCarts.length}`);
        console.log(`🌍 Public Active Carts: ${publicCarts.length}\n`);
        
        if (publicCarts.length === 0) {
            console.log('❌ NO PUBLIC ACTIVE CARTS FOUND!\n');
            console.log('Let me check all carts:\n');
            
            allCarts.forEach(cart => {
                console.log(`Cart ID: ${cart._id}`);
                console.log(`  Platform: ${cart.platform}`);
                console.log(`  Creator: ${cart.creator?.name || 'Unknown'}`);
                console.log(`  Status: ${cart.status}`);
                console.log(`  isPublic: ${cart.isPublic}`);
                console.log(`  Members: ${cart.members.length}/${cart.maxMembers}`);
                console.log('');
            });
        } else {
            console.log('✅ Public carts found:\n');
            publicCarts.forEach(cart => {
                console.log(`📦 ${cart.platform.toUpperCase()} - ₹${cart.deliveryCharge}`);
                console.log(`   Creator: ${cart.creator?.name || 'Unknown'} (${cart.creator?.email || 'N/A'})`);
                console.log(`   Members: ${cart.members.length}/${cart.maxMembers}`);
                console.log(`   Location: ${cart.location.city}`);
                console.log(`   Notes: ${cart.notes || 'No notes'}`);
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

checkCarts();
