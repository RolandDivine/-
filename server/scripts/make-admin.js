const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function makeFirstUserAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pandora-intel', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Find the first user and make them admin
    const user = await User.findOne({});
    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`✅ User "${user.email}" is now an admin!`);
    } else {
      console.log('❌ No users found. Please register first.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

makeFirstUserAdmin();
