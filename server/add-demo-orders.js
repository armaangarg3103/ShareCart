const mongoose = require('mongoose');
const Order = require('./models/Order');
const Cart = require('./models/Cart');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sharecart')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

async function addDemoOrders() {
    try {
        // Find rahul user
        const user = await User.findOne({ email: 'rahul@gmail.com' });
        if (!user) {
            console.log('User rahul@gmail.com not found!');
            process.exit(1);
        }

        console.log('Found user:', user.name, 'ID:', user._id);

        // Create demo carts and orders
        const demoData = [
            {
                cartName: 'Snacks Order - Delivered',
                items: [
                    { name: 'Lays Classic Chips', price: 20, quantity: 3, user: user._id },
                    { name: 'Coca Cola 750ml', price: 40, quantity: 2, user: user._id },
                    { name: 'Parle-G Biscuits', price: 10, quantity: 5, user: user._id }
                ],
                totalAmount: 190,
                deliveryCharge: 50,
                platform: 'blinkit',
                status: 'delivered',
                createdDate: new Date('2025-11-20')
            },
            {
                cartName: 'Groceries Order - Delivered',
                items: [
                    { name: 'Tata Salt 1kg', price: 22, quantity: 2, user: user._id },
                    { name: 'Fortune Sunflower Oil 1L', price: 150, quantity: 1, user: user._id },
                    { name: 'India Gate Basmati Rice 1kg', price: 120, quantity: 1, user: user._id }
                ],
                totalAmount: 314,
                deliveryCharge: 0,
                platform: 'bigbasket',
                status: 'delivered',
                createdDate: new Date('2025-11-15')
            },
            {
                cartName: 'Quick Snacks - In Transit',
                items: [
                    { name: 'Maggi Noodles 4-Pack', price: 56, quantity: 2, user: user._id },
                    { name: "Haldiram's Bhujia", price: 40, quantity: 3, user: user._id }
                ],
                totalAmount: 352,
                deliveryCharge: 0,
                platform: 'zepto',
                status: 'out_for_delivery',
                createdDate: new Date('2025-11-25')
            },
            {
                cartName: 'Evening Snacks - Pending',
                items: [
                    { name: 'Britannia Good Day', price: 30, quantity: 4, user: user._id },
                    { name: 'Pepsi 750ml', price: 40, quantity: 3, user: user._id }
                ],
                totalAmount: 240,
                deliveryCharge: 0,
                platform: 'swiggy',
                status: 'confirmed',
                createdDate: new Date('2025-11-27')
            }
        ];

        const createdOrders = [];

        for (const data of demoData) {
            // Create cart first
            const cart = await Cart.create({
                creator: user._id,
                platform: data.platform,
                location: {
                    type: 'Point',
                    coordinates: user.location?.coordinates || [77.2090, 28.6139],
                    address: user.location?.address || 'New Delhi, India',
                    city: user.location?.city || 'Delhi',
                    pincode: user.location?.pincode || '110001'
                },
                deliveryCharge: data.deliveryCharge,
                maxMembers: 4,
                members: [{
                    user: user._id,
                    status: 'completed',
                    splitAmount: data.deliveryCharge
                }],
                status: data.status === 'delivered' ? 'completed' : data.status === 'out_for_delivery' ? 'ordered' : 'ordering',
                orderTime: data.createdDate,
                deliveryTime: data.status === 'delivered' ? new Date(data.createdDate.getTime() + 45 * 60 * 1000) : null,
                isPublic: false,
                createdAt: data.createdDate,
                updatedAt: data.createdDate
            });

            // Create order
            const orderNumber = `SC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            const order = await Order.create({
                orderNumber: orderNumber,
                cart: cart._id,
                platform: data.platform,
                members: [{
                    user: user._id,
                    splitAmount: data.totalAmount + data.deliveryCharge,
                    paymentStatus: data.status === 'delivered' ? 'paid' : 'pending',
                    paidAt: data.status === 'delivered' ? data.createdDate : null
                }],
                totalAmount: data.totalAmount,
                deliveryCharge: data.deliveryCharge,
                status: data.status === 'delivered' ? 'delivered' : data.status === 'out_for_delivery' ? 'out_for_delivery' : 'confirmed',
                deliveryLocation: {
                    address: user.location?.address || 'New Delhi, India',
                    city: user.location?.city || 'Delhi',
                    pincode: user.location?.pincode || '110001',
                    coordinates: user.location?.coordinates || [77.2090, 28.6139]
                },
                items: data.items,
                orderPlacedAt: data.createdDate,
                estimatedDeliveryTime: new Date(data.createdDate.getTime() + 60 * 60 * 1000),
                actualDeliveryTime: data.status === 'delivered' ? new Date(data.createdDate.getTime() + 45 * 60 * 1000) : null,
                createdAt: data.createdDate,
                updatedAt: data.createdDate
            });

            createdOrders.push(order);
        }

        console.log(`\n✅ Successfully added ${createdOrders.length} demo orders for ${user.name}\n`);
        
        // Display orders
        createdOrders.forEach((order, index) => {
            console.log(`Order ${index + 1}:`);
            console.log(`  ID: ${order.orderNumber}`);
            console.log(`  Items: ${order.items.length}`);
            console.log(`  Total: ₹${order.totalAmount + order.deliveryCharge}`);
            console.log(`  Platform: ${order.platform}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Date: ${order.createdAt.toDateString()}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error adding demo orders:', error);
        process.exit(1);
    }
}

addDemoOrders();
