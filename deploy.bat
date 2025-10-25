@echo off
echo 🚀 Pandora Intel - Enterprise Deployment Script
echo ================================================

echo.
echo 📦 Step 1: Installing Dependencies...
cd server
call npm install
cd ..\client
call npm install
cd ..

echo.
echo 🏗️ Step 2: Building Frontend for Production...
cd client
call npm run build
cd ..

echo.
echo 🔧 Step 3: Starting Backend Server...
cd server
echo Backend server will start on http://localhost:5000
echo API Documentation: http://localhost:5000/api/docs
echo.
echo Press Ctrl+C to stop the server
echo.
call npm start
