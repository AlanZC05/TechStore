const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load service-specific .env or root .env, falling back to .env.example if .env is not present
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
  port: Number(process.env.AUTH_SERVICE_PORT || process.env.PORT || 4001),
  jwtSecret: process.env.JWT_SECRET || 'techstore_mx_super_secret_hs256_signing_key_2026_e3_e4',
  jwtIssuer: process.env.JWT_ISSUER || 'techstore-auth-service',
  jwtAudience: ['techstore-main-backend', 'techstore-fx-microservice'],
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS || 900),
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

module.exports = config;

