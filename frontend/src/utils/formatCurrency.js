// frontend/src/utils/formatCurrency.js
/**
 * Format a number as a currency string
 * @param {Number} amount - The amount to format
 * @param {String} currency - Currency code (default: 'THB')
 * @returns {String} Formatted currency string
 */
// frontend/src/utils/formatCurrency.js

/**
 * Format a number or numeric‐string as a currency string with grouping.
 * @param {number|string} rawAmount – the value to format (may include commas)
 * @param {string} currency     – ISO currency code (default: 'THB')
 * @returns {string}             – e.g. "฿1,234,567.89"
 */
export const formatCurrency = (rawAmount, currency = 'THB') => {
  // 1) Turn anything into a Number, stripping out commas
  const amount = parseFloat(
    String(rawAmount)
      .replace(/,/g, '')    // remove any existing commas
      .trim()
  );

  // 2) If it’s not a number, show zero (or blank for non-THB)
  if (isNaN(amount)) {
    return currency === 'THB' ? '฿0.00' : '';
  }

  // 3) Use Intl.NumberFormat to do grouping + currency symbol
  return new Intl.NumberFormat('en-US', {
    style:           'currency',
    currency,                // e.g. "THB"
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
