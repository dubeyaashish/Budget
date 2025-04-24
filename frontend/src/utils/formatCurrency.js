// frontend/src/utils/formatCurrency.js
/**
 * Format a number as a currency string
 * @param {Number} amount - The amount to format
 * @param {String} currency - Currency code (default: 'THB')
 * @returns {String} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'THB') => {
    if (amount === null || amount === undefined) {
      return '฿0.00';
    }
    
    // For Thai Baht
    if (currency === 'THB') {
      return `฿${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    }
    
    // Fallback to general formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  // frontend/src/utils/validateForm.js
  /**
   * Validate email format
   * @param {String} email - Email to validate
   * @returns {Boolean} True if valid
   */
  export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validate password strength
   * @param {String} password - Password to validate
   * @returns {Object} Validation result with isValid and message
   */
  export const validatePassword = (password) => {
    if (!password || password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long'
      };
    }
    
    // Check for at least one number
    if (!/\d/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number'
      };
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }
    
    return {
      isValid: true,
      message: 'Password is strong'
    };
  };
  
  /**
   * Validate form fields
   * @param {Object} formData - Form data
   * @param {Array} requiredFields - List of required field names
   * @returns {Object} Validation result with isValid and errors
   */
  export const validateForm = (formData, requiredFields = []) => {
    const errors = {};
    
    // Check required fields
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        errors[field] = 'This field is required';
      }
    }
    
    // Check email if it exists in form data
    if (formData.email !== undefined && formData.email.trim() !== '' && !isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Check password if it exists in form data
    if (formData.password !== undefined && formData.password.trim() !== '') {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.message;
      }
    }
    
    // Check password confirmation if it exists
    if (formData.confirmPassword !== undefined && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };