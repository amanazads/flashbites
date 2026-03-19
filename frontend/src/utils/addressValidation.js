/**
 * Address Validation Utilities
 * Prevents invalid or low-quality addresses from being saved
 */

/**
 * Check if text contains too many repeated characters (gibberish signal)
 * @param {string} text
 * @param {number} maxRepeats
 * @returns {boolean}
 */
export const validateRepeatedChars = (text, maxRepeats = 3) => {
  const value = String(text || '');
  const pattern = new RegExp(`(.)\\1{${maxRepeats},}`, 'i');
  return !pattern.test(value);
};

/**
 * Check if text looks like random gibberish
 * @param {string} text
 * @returns {boolean}
 */
export const validateNotGibberish = (text) => {
  const value = String(text || '').trim();

  if (value.length < 3) return false;

  const lettersOnly = value.replace(/[^a-z]/gi, '');
  if (!lettersOnly.length) return false;

  const tooManyConsonantsInRow = /[bcdfghjklmnpqrstvwxyz]{6,}/i.test(value);
  if (tooManyConsonantsInRow) return false;

  const vowelCount = (lettersOnly.match(/[aeiou]/gi) || []).length;
  if (vowelCount / lettersOnly.length < 0.15) return false;

  const singleLongWordOnlyLowercase = /^[a-z]{16,}$/.test(value);
  if (singleLongWordOnlyLowercase) return false;

  return true;
};

/**
 * Validate street address
 * @param {string} street
 * @returns {{isValid: boolean, error: string | null}}
 */
export const validateStreet = (street) => {
  const value = String(street || '').trim();

  if (!value) {
    return { isValid: false, error: 'Street address is required' };
  }

  if (value.length < 5) {
    return { isValid: false, error: 'Street address is too short. Please enter a valid address.' };
  }

  if (value.length > 200) {
    return { isValid: false, error: 'Street address is too long' };
  }

  if (!validateRepeatedChars(value)) {
    return { isValid: false, error: 'Invalid address format. Please avoid repeated characters.' };
  }

  if (!validateNotGibberish(value)) {
    return { isValid: false, error: 'Please enter a valid street address with recognizable words.' };
  }

  const hasAddressSignal = /\d|house|flat|apartment|apt|building|block|plot|sector|street|road|lane|avenue|nagar|colony|society|complex/i.test(value);
  if (!hasAddressSignal) {
    return { isValid: false, error: 'Please include house/flat number or building name in the address.' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate landmark (optional)
 * @param {string} landmark
 * @returns {{isValid: boolean, error: string | null}}
 */
export const validateLandmark = (landmark) => {
  const value = String(landmark || '').trim();

  if (!value) {
    return { isValid: true, error: null };
  }

  if (value.length < 3) {
    return { isValid: false, error: 'Landmark is too short' };
  }

  if (value.length > 100) {
    return { isValid: false, error: 'Landmark is too long' };
  }

  if (!validateRepeatedChars(value)) {
    return { isValid: false, error: 'Invalid landmark format. Please avoid repeated characters.' };
  }

  if (!validateNotGibberish(value)) {
    return { isValid: false, error: 'Please enter a valid landmark with recognizable words.' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate city
 * @param {string} city
 * @returns {{isValid: boolean, error: string | null}}
 */
export const validateCity = (city) => {
  const value = String(city || '').trim();

  if (!value) {
    return { isValid: false, error: 'City is required' };
  }

  if (value.length < 2) {
    return { isValid: false, error: 'City name is too short' };
  }

  if (!/^[a-zA-Z\s\-.]+$/.test(value)) {
    return { isValid: false, error: 'City name should only contain letters' };
  }

  if (!validateRepeatedChars(value)) {
    return { isValid: false, error: 'Invalid city name format' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate state
 * @param {string} state
 * @returns {{isValid: boolean, error: string | null}}
 */
export const validateState = (state) => {
  const value = String(state || '').trim();

  if (!value) {
    return { isValid: false, error: 'State is required' };
  }

  if (value.length < 2) {
    return { isValid: false, error: 'State name is too short' };
  }

  if (!/^[a-zA-Z\s\-.]+$/.test(value)) {
    return { isValid: false, error: 'State name should only contain letters' };
  }

  if (!validateRepeatedChars(value)) {
    return { isValid: false, error: 'Invalid state name format' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate Indian PIN code
 * @param {string} zipCode
 * @returns {{isValid: boolean, error: string | null}}
 */
export const validateZipCode = (zipCode) => {
  const value = String(zipCode || '').trim();

  if (!/^\d{6}$/.test(value)) {
    return { isValid: false, error: 'Valid 6-digit PIN code is required' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate complete address form
 * @param {{street?: string, landmark?: string, city?: string, state?: string, zipCode?: string}} formData
 * @param {boolean} isPincodeVerified
 * @returns {{isValid: boolean, errors: Record<string, string>}}
 */
export const validateAddressForm = (formData = {}, isPincodeVerified = false) => {
  const errors = {};

  const streetValidation = validateStreet(formData.street);
  if (!streetValidation.isValid) errors.street = streetValidation.error;

  const landmarkValidation = validateLandmark(formData.landmark);
  if (!landmarkValidation.isValid) errors.landmark = landmarkValidation.error;

  const cityValidation = validateCity(formData.city);
  if (!cityValidation.isValid) errors.city = cityValidation.error;

  const stateValidation = validateState(formData.state);
  if (!stateValidation.isValid) errors.state = stateValidation.error;

  const zipValidation = validateZipCode(formData.zipCode);
  if (!zipValidation.isValid) {
    errors.zipCode = zipValidation.error;
  } else if (!isPincodeVerified) {
    errors.zipCode = 'Please wait for PIN code verification or enter a valid PIN code';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const addressValidation = {
  validateRepeatedChars,
  validateNotGibberish,
  validateStreet,
  validateLandmark,
  validateCity,
  validateState,
  validateZipCode,
  validateAddressForm
};

export default addressValidation;
