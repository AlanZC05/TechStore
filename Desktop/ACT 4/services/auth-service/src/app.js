const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow browser requests from Vite frontend and REST clients / tests without origin header
      const allowedOrigins = [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'];
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'techstore-auth-service',
    port: config.port
  });
});

app.use('/api/v1/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

