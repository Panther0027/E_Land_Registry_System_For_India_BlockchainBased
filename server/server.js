import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import connectDB from './config/db.js';
import http from 'http';
import { initSocket } from './config/socket.js';
import {
  initBuiltinDemoAccounts,
  initPrimaryAccountFromEnv,
  getDemoUserByEmail,
} from './services/demoAuthStore.js';
import { seedDemoProperties } from './data/demoPropertyStore.js';
import { DEMO_PROPERTIES } from './data/demoProperties.js';
import { isDemoModeEnabled } from './config/appConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 5000;

const seedOfflineDemoData = async () => {
  const primaryEmail = process.env.REGISTRY_PRIMARY_EMAIL?.trim().toLowerCase();
  const primaryUser = primaryEmail ? getDemoUserByEmail(primaryEmail) : null;
  if (!primaryUser) return;

  const targetCount = Math.ceil(DEMO_PROPERTIES.length / 2);
  const statusPriority = ['verified', 'disputed', 'pending'];
  const selected = [];

  for (const status of statusPriority) {
    for (const property of DEMO_PROPERTIES) {
      if (selected.length >= targetCount) break;
      if (property.status === status && !selected.includes(property)) {
        selected.push(property);
      }
    }
    if (selected.length >= targetCount) break;
  }

  const halfDemo = selected.length ? selected : DEMO_PROPERTIES.slice(0, targetCount);

  seedDemoProperties(
    halfDemo.map((property) => ({
      userId: primaryUser.id ?? primaryUser._id,
      property: {
        ...property,
        ownerName: primaryUser.fullName,
      },
    }))
  );
};

const start = async () => {
  const dbOk = await connectDB();
  if (!dbOk) {
    process.env.BHUMI_OFFLINE_MODE = '1';
    await initPrimaryAccountFromEnv();
    await initBuiltinDemoAccounts();
    await seedOfflineDemoData();
    console.warn('⚠️  MongoDB offline — you can still log in with REGISTRY_PRIMARY_EMAIL from .env');
    console.warn('   Fix Atlas IP whitelist + MONGODB_URI, then run: npm run setup:primary');
  } else {
    console.log('✓ MongoDB connected — production mode (real accounts & dataset).');
  }

  const server = http.createServer(app);
  // initialize socket.io
  initSocket(server);

  app.get("/", (req, res) => {
  res.send("Backend is running successfully");
});

  server.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║   🌿 Bhumi Land Registry API         ║
  ║   Server running on port ${PORT}         ║
  ╚══════════════════════════════════════╝
  `);
  });
};

start();
