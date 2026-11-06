const config = require('../config/env');

/**
 * In-Memory Exchange Rate Repository (DAO Pattern mirroring `exchange_rates` SQL table)
 * Seeded at startup with initial USD/MXN rate (19.854) from Banxico SF43718 series.
 */
class RateRepository {
  constructor() {
    this.rates = new Map();
    this.seed();
  }

  seed() {
    this.rates.set('USD/MXN', {
      pair: 'USD/MXN',
      baseCurrency: 'USD',
      targetCurrency: 'MXN',
      rate: config.fallbackUsdMxnRate,
      source: 'Banxico-SF43718',
      stale: false,
      updatedAt: new Date().toISOString()
    });
  }

  getRate(pair = 'USD/MXN') {
    const record = this.rates.get(pair);
    return record ? { ...record } : null;
  }

  upsertRate({ pair = 'USD/MXN', rate, source = 'Banxico-SF43718', stale = false }) {
    const [baseCurrency, targetCurrency] = pair.split('/');
    const updated = {
      pair,
      baseCurrency,
      targetCurrency,
      rate: Number(rate),
      source,
      stale: Boolean(stale),
      updatedAt: new Date().toISOString()
    };
    this.rates.set(pair, updated);
    return { ...updated };
  }

  markStale(pair = 'USD/MXN') {
    const existing = this.rates.get(pair);
    if (existing) {
      existing.stale = true;
      this.rates.set(pair, existing);
      return { ...existing };
    }
    return null;
  }
}

module.exports = new RateRepository();

