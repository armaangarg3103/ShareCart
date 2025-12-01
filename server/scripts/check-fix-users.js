require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const checkAndFixUsers = async () => {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const usersCollection = mongoose.connection.db.collection('users');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      await mongoose.connection.close();
      return;
    }

    console.log('👥 Sample users:');
    for (let i = 0; i < Math.min(5, users.length); i++) {
      const user = users[i];
      console.log(`${i + 1}. ${user.name} (${user.email})`);
      console.log(`   Password field exists: ${!!user.password}`);
      console.log(`   Password starts with $2: ${user.password?.startsWith('$2')}`);
      console.log('');
    }

    // Check if passwords are hashed
    const usersWithoutHashedPassword = users.filter(u => !u.password || !u.password.startsWith('$2'));
    
    if (usersWithoutHashedPassword.length > 0) {
      console.log(`⚠️  Found ${usersWithoutHashedPassword.length} users with unhashed passwords`);
      console.log('💡 These users need password reset or re-registration\n');
    } else {
      console.log('✅ All users have properly hashed passwords\n');
    }

    // Create a test user with known password for testing
    const testEmail = 'test@sharecart.com';
    const testUser = await usersCollection.findOne({ email: testEmail });
    
    if (!testUser) {
      console.log('🔧 Creating test user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await usersCollection.insertOne({
        name: 'Test User',
        email: testEmail,
        password: hashedPassword,
        phone: '9999999999',
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
      
      console.log('✅ Test user created!');
      console.log('📧 Email: test@sharecart.com');
      console.log('🔑 Password: password123\n');
    } else {
      console.log('ℹ️  Test user already exists');
      console.log('📧 Email: test@sharecart.com\n');
    }

    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkAndFixUsers();
