const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware to verify Bearer JWT with pinned HS256 algorithm and issuer validation.
 */
function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization Bearer header'
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization Bearer header'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer
    });
    req.user = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token signature or expired credential'
    });
  }
}

module.exports = { authenticateJwt };

