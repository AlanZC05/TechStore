const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load service-specific .env or root .env, falling back to .env.example if .env is missing
const serviceEnv = path.resolve(__dirname, '../../.env');
const rootEnv = path.resolve(__dirname, '../../../../.env');
const serviceEnvExample = path.resolve(__dirname, '../../.env.example');
const rootEnvExample = path.resolve(__dirname, '../../../../.env.example');

if (fs.existsSync(serviceEnv)) {
  dotenv.config({ path: serviceEnv });
}
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}
if (fs.existsSync(serviceEnvExample)) {
  dotenv.config({ path: serviceEnvExample });
}
if (fs.existsSync(rootEnvExample)) {
  dotenv.config({ path: rootEnvExample });
}

const config = {
  port: Number(process.env.FX_SERVICE_PORT || process.env.PORT || 4002),
  jwtSecret: process.env.JWT_SECRET || 'techstore_mx_super_secret_hs256_signing_key_2026_e3_e4',
  jwtIssuer: process.env.JWT_ISSUER || 'techstore-auth-service',
  jwtAudience: 'techstore-fx-microservice',
  banxicoApiToken: process.env.BANXICO_API_TOKEN || 'demo_token_or_real_token',
  banxicoSeriesId: process.env.BANXICO_SERIES_ID || 'SF43718',
  banxicoTimeoutMs: Number(process.env.BANXICO_TIMEOUT_MS || 4000),
  fallbackUsdMxnRate: Number(process.env.FALLBACK_USD_MXN_RATE || 19.854),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

module.exports = config;

