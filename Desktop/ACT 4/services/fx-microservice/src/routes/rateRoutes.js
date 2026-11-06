const express = require('express');
const { z } = require('zod');
const rateRepository = require('../repositories/rateRepository');
const { syncUsdMxnFromBanxico } = require('../services/banxicoService');
const { verifyBearerToken, requireAdminRole } = require('../middleware/jwtAuthMiddleware');

const router = express.Router();

const SUPPORTED_CURRENCIES = ['MXN', 'USD'];

const currentRateQuerySchema = z.object({
  base: z
    .string()
    .optional()
    .default('USD')
    .transform((val) => val.toUpperCase())
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)'
    }),
  target: z
    .string()
    .optional()
    .default('MXN')
    .transform((val) => val.toUpperCase())
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)'
    })
});

const convertBodySchema = z.object({
  amount: z
    .number({
      required_error: 'Amount must be a positive number greater than 0',
      invalid_type_error: 'Amount must be a positive number greater than 0'
    })
    .positive('Amount must be a positive number greater than 0'),
  from: z
    .string({
      required_error: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)',
      invalid_type_error: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)'
    })
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)'
    }),
  to: z
    .string({
      required_error: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)',
      invalid_type_error: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)'
    })
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: 'Currency code must be a valid 3-letter ISO 4217 string (MXN, USD)'
    })
});

const refreshBodySchema = z.object({
  currency: z
    .string({
      invalid_type_error: 'Currency must be "USD"'
    })
    .optional()
    .default('USD')
    .refine((val) => val === 'USD', {
      message: 'Only "USD" currency refresh is supported for Banxico series SF43718'
    }),
  simulateDown: z.boolean().optional()
});

/**
 * GET /api/v1/rates/current (Public)
 * Query: ?base=USD&target=MXN (defaults to USD and MXN if omitted; 400 if unsupported currency)
 */
router.get('/current', (req, res, next) => {
  try {
    const parsed = currentRateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'query',
          message: issue.message
        }))
      });
    }

    const { base, target } = parsed.data;
    const cached = rateRepository.getRate('USD/MXN');

    let computedRate = cached.rate;
    if (base === 'MXN' && target === 'USD') {
      computedRate = Number((1 / cached.rate).toFixed(6));
    } else if (base === target) {
      computedRate = 1;
    }

    return res.status(200).json({
      pair: `${base}/${target}`,
      rate: computedRate,
      updatedAt: cached.updatedAt,
      stale: cached.stale
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/rates/convert (Public)
 * Body: { amount, from, to }
 */
router.post('/convert', (req, res, next) => {
  try {
    const parsed = convertBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message
        }))
      });
    }

    const { amount, from, to } = parsed.data;
    const cached = rateRepository.getRate('USD/MXN');
    const rateUsed = cached.rate;

    let convertedAmount;
    if (from === 'MXN' && to === 'USD') {
      convertedAmount = Number((amount / rateUsed).toFixed(2));
    } else if (from === 'USD' && to === 'MXN') {
      convertedAmount = Number((amount * rateUsed).toFixed(2));
    } else {
      convertedAmount = Number(amount.toFixed(2));
    }

    return res.status(200).json({
      originalAmount: amount,
      convertedAmount,
      rateUsed,
      from,
      to
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/rates/refresh (Protected by JWT + Admin Role)
 * Body: { "currency": "USD" }
 */
router.post('/refresh', verifyBearerToken, requireAdminRole, async (req, res, next) => {
  try {
    const parsed = refreshBodySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'currency',
          message: issue.message
        }))
      });
    }

    const simulateDown =
      req.query.simulateDown === 'true' ||
      parsed.data.simulateDown === true ||
      req.headers['x-simulate-down'] === 'true';

    const updatedRecord = await syncUsdMxnFromBanxico({ simulateDown });

    return res.status(201).json({
      pair: updatedRecord.pair,
      rate: updatedRecord.rate,
      source: updatedRecord.source,
      updatedAt: updatedRecord.updatedAt
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

