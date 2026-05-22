import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initBlockchain, setupEventListeners } from './config/blockchain.js';
import { handleBlockchainEvent } from './services/blockchainService.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

initBlockchain();
setupEventListeners(handleBlockchainEvent);

app.use(helmet());
const devMode = process.env.NODE_ENV !== 'production';

// Support multiple allowed origins via comma-separated CLIENT_URL env var.
// Normalize values (trim and strip trailing slash) to avoid mismatches.
const clientUrlEnv = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = clientUrlEnv
  .split(',')
  .map((u) => u.trim().replace(/\/$/, ''))
  .filter(Boolean);
console.log('Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (devMode) return callback(null, true);
      // allow non-browser tools (curl/postman) where origin is undefined
      if (!origin) return callback(null, true);
        console.log('CORS origin check:', { origin });
        const normalized = origin.replace(/\/$/, '');
        console.log('CORS origin normalized:', normalized, 'allowedOrigins:', allowedOrigins);
        if (allowedOrigins.indexOf(normalized) !== -1) return callback(null, true);
        console.log('CORS rejected origin:', normalized);
        return callback(new Error('CORS not allowed'));
    },
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/demo-assets', express.static(path.join(__dirname, 'demo-assets')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bhumi API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
