const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const productRoutes = require('./routes/productRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'techstore-main-backend',
    port: config.port
  });
});

app.use('/api/v1/products', productRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

