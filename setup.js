const fs = require('fs');
const path = require('path');

// Create .env file for server
const envContent = `# Database Configuration
MONGODB_URI=mongodb://localhost:27017/pandora-intel

# JWT Secret Key (Change this to a secure random string in production)
JWT_SECRET=pandora-intel-super-secret-jwt-key-2024

# Client URL
CLIENT_URL=http://localhost:3000

# API Keys (Optional - for enhanced features)
COINGECKO_API_KEY=
BINANCE_API_KEY=
BINANCE_SECRET_KEY=

# Server Configuration
PORT=5000
NODE_ENV=development`;

const envPath = path.join(__dirname, 'server', '.env');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully in server directory');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
}

console.log('\n🚀 Setup Instructions:');
console.log('1. Make sure MongoDB is running on your system');
console.log('2. Run: npm run install-all');
console.log('3. Run: npm run dev');
console.log('\n📱 Access the app at: http://localhost:3000');
console.log('🔧 Backend API at: http://localhost:5000');
