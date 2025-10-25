const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');

// Create a test Express app
const app = express();
app.use(express.json());

// Import routes
const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);

// Health check for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

describe('Auth API', () => {
  const userData = {
    username: 'testuser1',
    email: 'testuser1@pandora.com',
    password: 'Test1234',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(async () => {
    // Clean up test users before each test
    await User.deleteMany({ email: /testuser/ });
  });

  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(userData.email);
  });

  it('logs in the new user', async () => {
    // First register a user
    await request(app)
      .post('/api/auth/register')
      .send(userData);

    // Then try to login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(userData.email);
  });

  it('rejects login with wrong password', async () => {
    // First register a user
    await request(app)
      .post('/api/auth/register')
      .send(userData);

    // Then try to login with wrong password
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: 'wrongpassword' });
    
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});