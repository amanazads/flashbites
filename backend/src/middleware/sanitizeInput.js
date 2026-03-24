const sanitizeObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeObject);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized = {};
  Object.entries(value).forEach(([key, val]) => {
    // Block common MongoDB operator injection vectors.
    if (key.startsWith('$') || key.includes('.')) {
      return;
    }
    sanitized[key] = sanitizeObject(val);
  });

  return sanitized;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

module.exports = sanitizeInput;