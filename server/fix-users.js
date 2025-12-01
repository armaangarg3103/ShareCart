const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

async function fixUsers() {
    try {
        console.log('Deleting existing users...');
        
        // Delete existing users
        await User.deleteOne({ email: 'sahil@gmail.com' });
        await User.deleteOne({ email: 'small@gmail.com' });
        
        console.log('Creating new users with plain text passwords...\n');
        
        // Create sahil user (password will be auto-hashed by pre-save hook)
        const sahil = await User.create({
            name: 'Sahil Kumar',
            email: 'sahil@gmail.com',
            phone: '9876543224',
            password: '123456', // Plain text - will be hashed by model
            location: {
                type: 'Point',
                coordinates: [77.2090, 28.6139],
                address: 'Connaught Place, New Delhi',
                city: 'Delhi',
                pincode: '110001'
            }
        });
        
        // Create small user
        const small = await User.create({
            name: 'small',
            email: 'small@gmail.com',
            phone: '9876543225',
            password: 'small123', // Plain text - will be hashed by model
            location: {
                type: 'Point',
                coordinates: [77.2100, 28.6150],
                address: 'Karol Bagh, New Delhi',
                city: 'Delhi',
                pincode: '110005'
            }
        });

        console.log('═'.repeat(60));
        console.log('     ✅ USERS CREATED SUCCESSFULLY     ');
        console.log('═'.repeat(60));
        
        console.log('\n📧 User 1:');
        console.log('   Email: sahil@gmail.com');
        console.log('   Password: 123456');
        console.log(`   ID: ${sahil._id}`);
        
        console.log('\n📧 User 2:');
        console.log('   Email: small@gmail.com');
        console.log('   Password: small123');
        console.log(`   ID: ${small._id}`);
        
        console.log('\n' + '═'.repeat(60));
        console.log('You can now login with these credentials!');
        console.log('═'.repeat(60) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixUsers();
