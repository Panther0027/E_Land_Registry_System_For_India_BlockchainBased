import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import connectDB from './config/db.js';
import { initBuiltinDemoAccounts } from './services/demoAuthStore.js';
import { isDemoModeEnabled } from './config/appConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 5000;

const start = async () => {
  const dbOk = await connectDB();
  if (!dbOk) {
    if (isDemoModeEnabled()) {
      process.env.BHUMI_OFFLINE_MODE = '1';
      await initBuiltinDemoAccounts();
      console.warn('⚠️  MongoDB offline — demo mode enabled.');
    } else {
      console.error('❌ MongoDB required. Fix MONGODB_URI / Atlas IP whitelist, then restart.');
    }
  } else {
    console.log('✓ MongoDB connected — production mode (real accounts & dataset).');
  }

  app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🌿 Bhumi Land Registry API         ║
  ║   Server running on port ${PORT}         ║
  ╚══════════════════════════════════════╝
  `);
  });
};

start();
