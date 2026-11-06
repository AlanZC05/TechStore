const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Verifies Bearer JWT token with pinned HS256 algorithm, issuer, and audience.
 * Returns 401 Unauthorized on missing/malformed header or invalid/expired signature.
 */
function verifyBearerToken(req, res, next) {
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
      issuer: config.jwtIssuer,
      audience: config.jwtAudience
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

/**
 * Role-Based Access Control (RBAC) middleware requiring `role === "admin"`.
 * Returns 403 Forbidden if authenticated user lacks admin role.
 */
function requireAdminRole(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions: admin role required'
    });
  }
  return next();
}

module.exports = {
  verifyBearerToken,
  requireAdminRole
};

