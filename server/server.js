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
  if (isDemoModeEnabled() && !dbOk) {
    await initBuiltinDemoAccounts();
    console.warn('⚠️  Demo mode: in-memory auth (MongoDB not connected).');
  } else if (!dbOk) {
    console.error('❌ MongoDB required. Set MONGODB_URI and start MongoDB (or use Docker).');
    console.error('   Demo mode disabled. Set ENABLE_DEMO_MODE=true only for offline demos.');
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
