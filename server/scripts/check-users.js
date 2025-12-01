require('dotenv').config();
const mongoose = require('mongoose');

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    
    // Check users collection directly
    const usersCollection = mongoose.connection.db.collection('users');
    const userCount = await usersCollection.countDocuments();
    const sampleUsers = await usersCollection.find({}).limit(3).toArray();
    
    console.log(`\n📊 Users in database: ${userCount}`);
    
    if (userCount > 0) {
      console.log('\n👥 Sample users:');
      sampleUsers.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name} (${user.email})`);
      });
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
};

checkUsers();
