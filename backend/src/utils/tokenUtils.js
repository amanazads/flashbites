const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const requireSecret = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

exports.generateToken = (id) => {
  const jwtSecret = requireSecret('JWT_SECRET');
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

exports.generateRefreshToken = (id) => {
  const refreshSecret = requireSecret('JWT_REFRESH_SECRET');
  return jwt.sign({ id }, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

exports.hashRefreshToken = (token) => {
  if (!token) return null;
  return crypto.createHash('sha256').update(token).digest('hex');
};

exports.verifyRefreshToken = (token) => {
  try {
    const refreshSecret = requireSecret('JWT_REFRESH_SECRET');
    return jwt.verify(token, refreshSecret);
  } catch (error) {
    return null;
  }
};