export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePhone = (phone) => {
  const regex = /^[0-9]{10}$/;
  return regex.test(phone);
};

export const validatePassword = (password) => {
  // At least 6 characters, 1 uppercase, 1 lowercase, 1 special character
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
  return regex.test(password);
};

export const validateForm = (formData, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach((field) => {
    const value = formData[field];
    const rule = rules[field];
    
    if (rule.required && !value) {
      errors[field] = `${field} is required`;
    }
    
    if (rule.email && value && !validateEmail(value)) {
      errors[field] = 'Invalid email format';
    }
    
    if (rule.phone && value && !validatePhone(value)) {
      errors[field] = 'Invalid phone number';
    }
    
    if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = `Minimum ${rule.minLength} characters required`;
    }
    
    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[field] = `Maximum ${rule.maxLength} characters allowed`;
    }
  });
  
  return errors;
};