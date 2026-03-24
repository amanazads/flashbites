const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseHandler');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const formatted = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
    value: err.value,
  }));

  return errorResponse(res, 400, 'Validation failed', formatted);
};

module.exports = validateRequest;