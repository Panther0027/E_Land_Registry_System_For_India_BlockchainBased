import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import connectDB from './config/db.js';
import { initBuiltinDemoAccounts } from './services/demoAuthStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 5000;

const start = async () => {
  const dbOk = await connectDB();
  await initBuiltinDemoAccounts();
  if (!dbOk) {
    console.warn('⚠️  API running without MongoDB — using in-memory demo auth for register/login.');
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
