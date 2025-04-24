const jwt = require('jwt-simple');
require('dotenv').config();

/**
 * Generate JWT token for authenticated user
 * @param {Object} payload - User data for token
 * @returns {String} JWT token
 */
exports.generateToken = (payload) => {
  return jwt.encode(payload, process.env.JWT_SECRET);
};

/**
 * Middleware to authenticate JWT token
 */
exports.authenticateToken = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.decode(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};
