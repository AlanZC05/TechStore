const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const { authenticateJwt } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiter specifically protecting /login against brute-force attacks
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // generous for automated tests & classroom demo while enforcing rate-limit headers
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many login attempts from this IP, please try again later'
  }
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Must be a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty')
});

function signAccessToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email
  };

  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: config.jwtExpiresInSeconds
  });
}

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

/**
 * POST /api/v1/auth/login
 */
router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message
        }))
      });
    }

    const { email, password } = parsed.data;
    const user = userRepository.findByEmail(email);

    // Constant-time comparison even if email does not exist
    const targetHash = user ? user.passwordHash : userRepository.getDummyHash();
    const isPasswordValid = await bcrypt.compare(password, targetHash);

    if (!user || !isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const accessToken = signAccessToken(user);
    const refreshRecord = refreshTokenRepository.create(user.id);

    res.cookie('refreshToken', refreshRecord.token, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      accessToken,
      expiresIn: config.jwtExpiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    if (!incomingToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing refreshToken cookie'
      });
    }

    const rotatedRecord = refreshTokenRepository.rotate(incomingToken);
    if (!rotatedRecord) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/v1/auth'
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid, expired, or revoked refresh token'
      });
    }

    const user = userRepository.findById(rotatedRecord.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User associated with refresh token no longer exists'
      });
    }

    const accessToken = signAccessToken(user);
    res.cookie('refreshToken', rotatedRecord.token, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      accessToken,
      expiresIn: config.jwtExpiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    if (incomingToken) {
      refreshTokenRepository.revoke(incomingToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/v1/auth'
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/auth/me
 */
router.get('/me', authenticateJwt, (req, res, next) => {
  try {
    const user = userRepository.findById(req.user.sub);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authenticated subject not found'
      });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

