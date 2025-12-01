const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

async function verifyUser() {
    try {
        // Check both users
        const sahil = await User.findOne({ email: 'sahil@gmail.com' }).select('+password');
        const small = await User.findOne({ email: 'small@gmail.com' }).select('+password');
        
        console.log('═'.repeat(60));
        console.log('              USER VERIFICATION              ');
        console.log('═'.repeat(60));
        
        if (sahil) {
            console.log('\n✅ Sahil User Found:');
            console.log(`   Email: ${sahil.email}`);
            console.log(`   Name: ${sahil.name}`);
            console.log(`   ID: ${sahil._id}`);
            console.log(`   Password Hash: ${sahil.password.substring(0, 20)}...`);
            
            // Test password
            const isMatch1 = await bcrypt.compare('123456', sahil.password);
            console.log(`   Password "123456" matches: ${isMatch1 ? '✅ YES' : '❌ NO'}`);
        } else {
            console.log('\n❌ Sahil user NOT found');
        }
        
        if (small) {
            console.log('\n✅ Small User Found:');
            console.log(`   Email: ${small.email}`);
            console.log(`   Name: ${small.name}`);
            console.log(`   ID: ${small._id}`);
            console.log(`   Password Hash: ${small.password.substring(0, 20)}...`);
            
            // Test password
            const isMatch2 = await bcrypt.compare('small', small.password);
            console.log(`   Password "small" matches: ${isMatch2 ? '✅ YES' : '❌ NO'}`);
        } else {
            console.log('\n❌ Small user NOT found');
        }
        
        console.log('\n' + '═'.repeat(60) + '\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifyUser();
