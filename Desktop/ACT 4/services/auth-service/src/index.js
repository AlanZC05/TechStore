const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.port, () => {
  console.log(`[auth-service] Listening on http://localhost:${config.port}`);
});

module.exports = server;

