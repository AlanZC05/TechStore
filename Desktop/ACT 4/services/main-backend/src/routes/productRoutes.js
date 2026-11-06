const express = require('express');
const productRepository = require('../repositories/productRepository');
const { fetchCurrentUsdMxnRate } = require('../services/fxClientService');

const router = express.Router();

/**
 * GET /api/v1/products
 * Returns 6 hardware products with priceMxn, priceUsd, and exchangeRateUsed
 * calculated via http://localhost:4002/api/v1/rates/current
 */
router.get('/', async (_req, res, next) => {
  try {
    const rawProducts = productRepository.findAll();
    const rateInfo = await fetchCurrentUsdMxnRate();

    const enrichedProducts = rawProducts.map((product) => ({
      ...product,
      priceUsd: Number((product.priceMxn / rateInfo.rate).toFixed(2)),
      exchangeRateUsed: rateInfo.rate,
      rateUpdatedAt: rateInfo.updatedAt,
      rateStale: rateInfo.stale
    }));

    return res.status(200).json(enrichedProducts);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

