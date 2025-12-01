const mongoose = require('mongoose');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const User = require('./models/User');

require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const rahul = await User.findOne({ email: 'rahul@gmail.com' });
        
        console.log('\n' + '═'.repeat(70));
        console.log('           📊 SHARECART DATABASE SUMMARY           ');
        console.log('═'.repeat(70));
        
        // My Carts
        const myCarts = await Cart.find({ creator: rahul._id }).populate('members.user', 'name');
        console.log(`\n📦 MY CARTS (Created by ${rahul.name}): ${myCarts.length}`);
        myCarts.forEach((cart, i) => {
            console.log(`  ${i + 1}. ${cart.platform.toUpperCase()} | ₹${cart.deliveryCharge} delivery | ${cart.members.length}/${cart.maxMembers} members | ${cart.status.toUpperCase()}`);
            console.log(`     Members: ${cart.members.map(m => m.user.name).join(', ')}`);
        });
        
        // Browse Carts
        const browseCarts = await Cart.find({ 
            creator: { $ne: rahul._id },
            status: { $in: ['active', 'full'] },
            isPublic: true
        }).populate('creator', 'name');
        console.log(`\n🔍 BROWSE CARTS (Public carts nearby): ${browseCarts.length}`);
        browseCarts.forEach((cart, i) => {
            console.log(`  ${i + 1}. ${cart.platform.toUpperCase()} by ${cart.creator.name} | ₹${cart.deliveryCharge} delivery | ${cart.members.length}/${cart.maxMembers} members | ${cart.status.toUpperCase()}`);
        });
        
        // My Orders
        const myOrders = await Order.find({ 'members.user': rahul._id }).sort({ createdAt: -1 });
        console.log(`\n📋 MY ORDERS (Order history): ${myOrders.length}`);
        myOrders.forEach((order, i) => {
            console.log(`  ${i + 1}. #${order.orderNumber} | ${order.platform.toUpperCase()} | ${order.status.toUpperCase()} | ₹${order.totalAmount + order.deliveryCharge} | ${order.createdAt.toDateString()}`);
        });
        
        // Total Users
        const totalUsers = await User.countDocuments();
        console.log(`\n👥 TOTAL USERS: ${totalUsers}`);
        
        console.log('\n' + '═'.repeat(70));
        console.log('✅ All demo data successfully loaded!');
        console.log('═'.repeat(70) + '\n');
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
