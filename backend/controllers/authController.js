// backend/controllers/authController.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jwt-simple');
const userModel = require('../models/userModel');
const { generateToken } = require('../middleware/authMiddleware');
const { transporter, generateOTP, getExpiryTime, getOTPTemplate } = require('../config/mailer');

/**
 * Registration (Step 1): Create pending registration and send OTP
 * POST /api/auth/register
 */
exports.register = (req, res) => {
  try {
    const { name, surname, employeeId, email, department, password, confirmPassword } = req.body;
    console.log('[REGISTER] payload:', { ...req.body, password: '***', confirmPassword: '***' });

    // Validate
    if (!name || !surname || !employeeId || !email || !department || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Default role is 'user'
    const role = 'user';

    // Check existing user
    userModel.findUserByEmail(email, (err, user) => {
      if (err) {
        console.error('[REGISTER] DB error on findUserByEmail:', err);
        return res.status(500).json({ message: 'Server error checking user.' });
      }
      if (user) {
        console.warn('[REGISTER] Email in use:', email);
        return res.status(400).json({ message: 'Email already in use.' });
      }

      // Hash + save pending + send OTP
      const otp = generateOTP();
      const otp_expiry = getExpiryTime();

      bcrypt.hash(password, 10, (hashErr, passwordHash) => {
        if (hashErr) {
          console.error('[REGISTER] bcrypt.hash error:', hashErr);
          return res.status(500).json({ message: 'Server error hashing password.' });
        }

        userModel.createPending({ 
          name, 
          surname, 
          employeeId, 
          email, 
          role, 
          department, 
          passwordHash, 
          otp, 
          otp_expiry 
        }, (insertErr) => {
          if (insertErr) {
            console.error('[REGISTER] DB error on createPending:', insertErr);
            return res.status(500).json({ message: 'Server error saving registration.' });
          }

          transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: email,
            subject: 'Your OTP Code for Budget Allocation App',
            html: getOTPTemplate(otp)
          }, (mailErr) => {
            if (mailErr) {
              console.error('[REGISTER] nodemailer error:', mailErr);
              return res.status(500).json({ message: 'Server error sending OTP email.' });
            }
            console.log('[REGISTER] OTP sent to', email, 'OTP:', otp);
            res.json({ message: 'OTP sent; please check your email.' });
          });
        });
      });
    });
  } catch (ex) {
    console.error('[REGISTER] Unexpected error:', ex);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * OTP Verification (Step 2): Verify OTP and create user
 * POST /api/auth/verify-otp
 */
exports.verifyOtp = (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log('[VERIFY OTP] payload:', req.body);

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email & OTP required.' });
    }

    userModel.findPendingByEmail(email, (err, pending) => {
      if (err) {
        console.error('[VERIFY OTP] DB error on findPendingByEmail:', err);
        return res.status(500).json({ message: 'Server error fetching pending.' });
      }
      if (!pending) {
        console.warn('[VERIFY OTP] No pending record for:', email);
        return res.status(400).json({ message: 'No pending registration found.' });
      }
      if (pending.otp !== otp) {
        console.warn('[VERIFY OTP] Invalid OTP for:', email);
        return res.status(400).json({ message: 'Invalid OTP.' });
      }
      if (new Date() > new Date(pending.otp_expiry)) {
        console.warn('[VERIFY OTP] OTP expired for:', email);
        return res.status(400).json({ message: 'OTP has expired.' });
      }

      // Insert real user
      userModel.createUser({
        name: pending.name,
        surname: pending.surname,
        employeeId: pending.employee_id,
        email: pending.email,
        role: pending.role,
        department: pending.department,
        passwordHash: pending.password
      }, (createErr) => {
        if (createErr) {
          console.error('[VERIFY OTP] DB error on createUser:', createErr);
          return res.status(500).json({ message: 'Server error creating user.' });
        }
        userModel.deletePending(email, (delErr) => {
          if (delErr) console.error('[VERIFY OTP] warning: deletePending error:', delErr);
          console.log('[VERIFY OTP] Registration complete for:', email);
          res.json({ message: 'Registration successful. You may now log in.' });
        });
      });
    });
  } catch (ex) {
    console.error('[VERIFY OTP] Unexpected error:', ex);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Login: Authenticate user and issue JWT
 * POST /api/auth/login
 */
exports.login = (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[LOGIN] payload:', { email, password: '***' });

    if (!email || !password) {
      return res.status(400).json({ message: 'Email & password required.' });
    }

    userModel.findUserByEmail(email, (err, user) => {
      if (err) {
        console.error('[LOGIN] DB error on findUserByEmail:', err);
        return res.status(500).json({ message: 'Server error during login.' });
      }
      if (!user) {
        console.warn('[LOGIN] No user found for:', email);
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      bcrypt.compare(password, user.password, (cmpErr, match) => {
        if (cmpErr) {
          console.error('[LOGIN] bcrypt.compare error:', cmpErr);
          return res.status(500).json({ message: 'Server error during login.' });
        }
        if (!match) {
          console.warn('[LOGIN] Password mismatch for:', email);
          return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const token = generateToken({ id: user.id, role: user.role });
        
        console.log('[LOGIN] success for:', email, 'role:', user.role);
        res.json({ 
          token, 
          role: user.role,
          user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            employeeId: user.employee_id,
            role: user.role,
            department: user.department
          }
        });
      });
    });
  } catch (ex) {
    console.error('[LOGIN] Unexpected error:', ex);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
exports.getProfile = (req, res) => {
  const userId = req.user.id;
  
  userModel.findUserById(userId, (err, user) => {
    if (err) {
      console.error('[PROFILE] DB error:', err);
      return res.status(500).json({ message: 'Server error fetching profile.' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Don't send password
    delete user.password;
    
    // Get user departments
    userModel.getUserDepartments(userId)
      .then(departments => {
        user.departments = departments;
        res.json(user);
      })
      .catch(deptErr => {
        console.error('[PROFILE] Error fetching departments:', deptErr);
        // Still return user data even if departments fetch fails
        res.json(user);
      });
  });
};