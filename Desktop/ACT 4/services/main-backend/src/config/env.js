const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

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
  port: Number(process.env.MAIN_BACKEND_PORT || process.env.PORT || 4000),
  fxServiceUrl: process.env.FX_SERVICE_URL || 'http://localhost:4002',
  fallbackUsdMxnRate: Number(process.env.FALLBACK_USD_MXN_RATE || 19.854),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

module.exports = config;

