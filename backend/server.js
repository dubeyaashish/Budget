// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const creditRoutes = require('./routes/creditRoutes');
const keyAccountRoutes = require('./routes/keyAccountRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({ 
  contentSecurityPolicy: false // Disable CSP for simplicity in production
})); 
app.use(morgan('dev')); // HTTP request logger
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/key-accounts', keyAccountRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the build directory
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // For any other route, send the index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});