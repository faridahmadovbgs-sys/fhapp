// Setup script for creating first admin user
// Run this script once to set up your first admin

const mongoose = require('mongoose');
const User = require('./src/models/User.js');

async function setupFirstAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yourapp');
    
    console.log('Connected to database...');
    
    // Email of the user who should be admin
    const ADMIN_EMAIL = 'your-admin@example.com'; // CHANGE THIS!
    
    // Find and update user to admin
    const user = await User.findOne({ email: ADMIN_EMAIL });
    
    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`✅ User ${ADMIN_EMAIL} has been promoted to admin!`);
    } else {
      console.log(`❌ User with email ${ADMIN_EMAIL} not found. Please register first.`);
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error setting up admin:', error);
  }
}

setupFirstAdmin();