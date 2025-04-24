const nodemailer = require('nodemailer');
require('dotenv').config();

// SMTP transporter for OTP emails
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.FROM_EMAIL,
    pass: process.env.OUTLOOK_PASS
  }
});

/**
 * Generate a 6-digit OTP code
 * @returns {String} 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get expiry time for OTP (5 minutes from now)
 * @returns {Date} Expiry time
 */
function getExpiryTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return now;
}

/**
 * Get HTML template for OTP email
 * @param {String} otp - OTP code
 * @returns {String} HTML email template
 */
function getOTPTemplate(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #FF5700; text-align: center;">Your OTP Code</h2>
      <p style="font-size: 16px; line-height: 1.5;">Please use the following one-time password to complete your registration:</p>
      <div style="text-align: center; padding: 15px; background-color: #f5f5f5; border-radius: 4px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #777; margin-top: 20px;">This code will expire in 5 minutes.</p>
      <p style="font-size: 14px; color: #777;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;
}

module.exports = {
  transporter,
  generateOTP,
  getExpiryTime,
  getOTPTemplate
};