const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test', override: true });

// Set test database
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pandora-intel-test';

// Connect to test database
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

// Clean up after tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});
