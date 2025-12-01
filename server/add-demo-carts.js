const mongoose = require('mongoose');
const Cart = require('./models/Cart');
const User = require('./models/User');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

async function addDemoCarts() {
    try {
        // Find rahul user
        const rahul = await User.findOne({ email: 'rahul@gmail.com' });
        if (!rahul) {
            console.log('User rahul@gmail.com not found!');
            process.exit(1);
        }

        console.log('Found user:', rahul.name, 'ID:', rahul._id);

        // Create some additional demo users if needed for members
        const demoUsers = [];
        const demoUserData = [
            { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210' },
            { name: 'Amit Kumar', email: 'amit@example.com', phone: '9876543211' },
            { name: 'Sneha Patel', email: 'sneha@example.com', phone: '9876543212' },
            { name: 'Ravi Singh', email: 'ravi@example.com', phone: '9876543213' }
        ];

        for (const userData of demoUserData) {
            let user = await User.findOne({ email: userData.email });
            if (!user) {
                user = await User.create({
                    ...userData,
                    password: '$2a$10$abcdefghijklmnopqrstuv', // Dummy hashed password
                    location: {
                        type: 'Point',
                        coordinates: [77.2090 + (Math.random() - 0.5) * 0.02, 28.6139 + (Math.random() - 0.5) * 0.02],
                        address: 'Delhi, India',
                        city: 'Delhi',
                        pincode: '110001'
                    }
                });
            }
            demoUsers.push(user);
        }

        console.log(`Created/Found ${demoUsers.length} demo users`);

        // Demo carts data
        const demoCarts = [
            // Rahul's created carts (for "My Carts")
            {
                creator: rahul._id,
                platform: 'blinkit',
                location: {
                    type: 'Point',
                    coordinates: [77.2090, 28.6139],
                    address: rahul.location?.address || 'Connaught Place, New Delhi',
                    city: 'Delhi',
                    pincode: '110001'
                },
                deliveryCharge: 50,
                maxMembers: 4,
                members: [
                    { user: rahul._id, status: 'joined', splitAmount: 25 },
                    { user: demoUsers[0]._id, status: 'joined', splitAmount: 25 }
                ],
                status: 'active',
                maxDistance: 2,
                isPublic: true,
                notes: 'Need snacks for movie night! Join quickly.',
                createdAt: new Date('2025-11-27T18:30:00'),
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
            },
            {
                creator: rahul._id,
                platform: 'zepto',
                location: {
                    type: 'Point',
                    coordinates: [77.2090, 28.6139],
                    address: rahul.location?.address || 'Connaught Place, New Delhi',
                    city: 'Delhi',
                    pincode: '110001'
                },
                deliveryCharge: 40,
                maxMembers: 3,
                members: [
                    { user: rahul._id, status: 'joined', splitAmount: 20 },
                    { user: demoUsers[1]._id, status: 'joined', splitAmount: 20 }
                ],
                status: 'active',
                maxDistance: 1.5,
                isPublic: true,
                notes: 'Morning breakfast items needed',
                createdAt: new Date('2025-11-28T07:00:00'),
                expiresAt: new Date(Date.now() + 1.5 * 60 * 60 * 1000)
            },
            // Public carts from other users (for "Browse Carts")
            {
                creator: demoUsers[0]._id,
                platform: 'swiggy',
                location: {
                    type: 'Point',
                    coordinates: [77.2100, 28.6145],
                    address: 'Rajiv Chowk, New Delhi',
                    city: 'Delhi',
                    pincode: '110001'
                },
                deliveryCharge: 60,
                maxMembers: 5,
                members: [
                    { user: demoUsers[0]._id, status: 'joined', splitAmount: 30 },
                    { user: demoUsers[2]._id, status: 'joined', splitAmount: 30 }
                ],
                status: 'active',
                maxDistance: 3,
                isPublic: true,
                notes: 'Office lunch order! 3 more people can join.',
                createdAt: new Date('2025-11-28T11:00:00'),
                expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000)
            },
            {
                creator: demoUsers[1]._id,
                platform: 'bigbasket',
                location: {
                    type: 'Point',
                    coordinates: [77.2080, 28.6130],
                    address: 'Janpath, New Delhi',
                    city: 'Delhi',
                    pincode: '110001'
                },
                deliveryCharge: 70,
                maxMembers: 4,
                members: [
                    { user: demoUsers[1]._id, status: 'joined', splitAmount: 35 },
                    { user: demoUsers[3]._id, status: 'joined', splitAmount: 35 }
                ],
                status: 'active',
                maxDistance: 2,
                isPublic: true,
                notes: 'Weekly groceries shopping. Save on delivery!',
                createdAt: new Date('2025-11-28T09:30:00'),
                expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
            },
            {
                creator: demoUsers[2]._id,
                platform: 'blinkit',
                location: {
                    type: 'Point',
                    coordinates: [77.2095, 28.6142],
                    address: 'Barakhamba Road, New Delhi',
                    city: 'Delhi',
                    pincode: '110001'
                },
                deliveryCharge: 50,
                maxMembers: 3,
                members: [
                    { user: demoUsers[2]._id, status: 'joined', splitAmount: 25 }
                ],
                status: 'active',
                maxDistance: 1,
                isPublic: true,
                notes: 'Quick snacks needed for party tonight!',
                createdAt: new Date('2025-11-28T15:00:00'),
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
            },
            {
                creator: demoUsers[3]._id,
                platform: 'zepto',
                location: {
                    type: 'Point',
                    coordinates: [77.2085, 28.6135],
                    address: 'Kasturba Gandhi Marg, New Delhi',
                    city: 'Delhi',
                    pincode: '110001'
                },
                deliveryCharge: 40,
                maxMembers: 4,
                members: [
                    { user: demoUsers[3]._id, status: 'joined', splitAmount: 13.33 },
                    { user: demoUsers[0]._id, status: 'joined', splitAmount: 13.33 },
                    { user: demoUsers[1]._id, status: 'joined', splitAmount: 13.33 }
                ],
                status: 'active',
                maxDistance: 2,
                isPublic: true,
                notes: 'Evening chai and snacks. One spot left!',
                createdAt: new Date('2025-11-28T16:00:00'),
                expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000)
            },
            // One full cart
            {
                creator: demoUsers[0]._id,
                platform: 'swiggy',
                location: {
                    type: 'Point',
                    coordinates: [77.2092, 28.6138],
                    address: 'Parliament Street, New Delhi',
                    city: 'Delhi',
                    pincode: '110001'
                },
                deliveryCharge: 50,
                maxMembers: 2,
                members: [
                    { user: demoUsers[0]._id, status: 'joined', splitAmount: 25 },
                    { user: demoUsers[1]._id, status: 'joined', splitAmount: 25 }
                ],
                status: 'full',
                maxDistance: 1.5,
                isPublic: true,
                notes: 'Cart is full! Placing order soon.',
                createdAt: new Date('2025-11-28T12:00:00'),
                expiresAt: new Date(Date.now() + 0.5 * 60 * 60 * 1000)
            }
        ];

        // Insert carts
        const createdCarts = await Cart.insertMany(demoCarts);
        console.log(`\n✅ Successfully added ${createdCarts.length} demo carts\n`);
        
        // Display summary
        console.log('Carts Summary:');
        console.log('═'.repeat(60));
        
        const rahulCarts = createdCarts.filter(c => c.creator.toString() === rahul._id.toString());
        console.log(`\n📦 Rahul's Carts (${rahulCarts.length}):`);
        rahulCarts.forEach(cart => {
            console.log(`  - ${cart.platform.toUpperCase()} | ₹${cart.deliveryCharge} | ${cart.members.length}/${cart.maxMembers} members | ${cart.status}`);
        });
        
        const browseCarts = createdCarts.filter(c => c.creator.toString() !== rahul._id.toString());
        console.log(`\n🔍 Browse Carts (${browseCarts.length}):`);
        browseCarts.forEach(cart => {
            const creator = demoUsers.find(u => u._id.toString() === cart.creator.toString());
            console.log(`  - ${cart.platform.toUpperCase()} by ${creator?.name} | ₹${cart.deliveryCharge} | ${cart.members.length}/${cart.maxMembers} members | ${cart.status}`);
        });

        console.log('\n' + '═'.repeat(60));
        process.exit(0);
    } catch (error) {
        console.error('Error adding demo carts:', error);
        process.exit(1);
    }
}

addDemoCarts();
