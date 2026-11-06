const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const directories = [
  rootDir,
  path.join(rootDir, 'services', 'auth-service'),
  path.join(rootDir, 'services', 'fx-microservice'),
  path.join(rootDir, 'services', 'main-backend'),
  path.join(rootDir, 'frontend')
];

for (const dir of directories) {
  const examplePath = path.join(dir, '.env.example');
  const envPath = path.join(dir, '.env');
  const relativeEnv = path.relative(rootDir, envPath) || '.env';

  if (fs.existsSync(examplePath) && !fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log(`[Setup] Created ${relativeEnv} from .env.example`);
  }
}

