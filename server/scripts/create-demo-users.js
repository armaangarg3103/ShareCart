require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const createDemoUsers = async () => {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const usersCollection = mongoose.connection.db.collection('users');
    
    // Delete all existing users
    await usersCollection.deleteMany({});
    console.log('🗑️  Cleared existing users\n');

    // Create demo users with known passwords
    const demoUsers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '9876543210'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        phone: '9876543211'
      },
      {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'password123',
        phone: '9876543212'
      },
      {
        name: 'Amit Kumar',
        email: 'amit@example.com',
        password: 'password123',
        phone: '9876543213'
      },
      {
        name: 'Test User',
        email: 'test@sharecart.com',
        password: 'password123',
        phone: '9999999999'
      }
    ];

    console.log('🔧 Creating demo users...\n');

    for (const userData of demoUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      await usersCollection.insertOne({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone,
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760],
          address: 'Mumbai, India',
          city: 'Mumbai',
          pincode: '400001'
        },
        avatar: 'https://via.placeholder.com/150',
        rating: 5.0,
        reviewCount: 0,
        ratingBreakdown: {
          punctuality: 5.0,
          communication: 5.0,
          reliability: 5.0
        },
        totalOrders: 0,
        totalSavings: 0,
        isVerified: false,
        isActive: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Created: ${userData.email}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('   Demo Users Created Successfully!');
    console.log('='.repeat(50));
    console.log('\n📋 Login Credentials (all users):');
    console.log('   Password: password123\n');
    console.log('📧 User Emails:');
    demoUsers.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.email} (${user.name})`);
    });
    console.log('\n💡 Use any email above with password: password123\n');

    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createDemoUsers();
