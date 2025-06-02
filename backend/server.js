const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pulse One API is running' });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    codename: 'Genesis'
  });
});

// Mock auth endpoints (until you integrate with Pulse360)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock login - replace with real auth later
  if (email === 'admin@pulseone.com' && password === 'admin123') {
    res.json({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        name: 'Admin User',
        email: 'admin@pulseone.com',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/auth/profile', (req, res) => {
  // Mock profile endpoint
  res.json({
    id: 1,
    name: 'Admin User',
    email: 'admin@pulseone.com',
    role: 'admin'
  });
});

// Pulse One routes
const pulseOneRoutes = require('./routes/pulse-one.routes');
app.use('/api', pulseOneRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Pulse One Backend running on port ${PORT}`);
});