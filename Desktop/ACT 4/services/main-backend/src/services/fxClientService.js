const config = require('../config/env');

/**
 * Consumes `GET http://localhost:4002/api/v1/rates/current` on fx-microservice
 * to retrieve the current USD/MXN exchange rate.
 */
async function fetchCurrentUsdMxnRate() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${config.fxServiceUrl}/api/v1/rates/current?base=USD&target=MXN`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`fx-microservice responded with status ${response.status}`);
    }

    const data = await response.json();
    const rate = Number(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Invalid rate value received from fx-microservice');
    }

    return {
      rate,
      pair: data.pair || 'USD/MXN',
      updatedAt: data.updatedAt || new Date().toISOString(),
      stale: Boolean(data.stale)
    };
  } catch (err) {
    console.warn(
      `[main-backend] Could not reach fx-microservice (${err.message}); using fallback rate ${config.fallbackUsdMxnRate}`
    );
    return {
      rate: config.fallbackUsdMxnRate,
      pair: 'USD/MXN',
      updatedAt: new Date().toISOString(),
      stale: true
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { fetchCurrentUsdMxnRate };

