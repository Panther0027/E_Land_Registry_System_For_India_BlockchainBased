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
import { isDemoModeEnabled } from './config/appConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 5000;

const seedOfflineDemoData = async () => {
  const primaryEmail = process.env.REGISTRY_PRIMARY_EMAIL?.trim().toLowerCase();
  const primaryUser = primaryEmail ? getDemoUserByEmail(primaryEmail) : null;
  if (!primaryUser) return;

  seedDemoProperties([
    {
      userId: primaryUser.id ?? primaryUser._id,
      property: {
        propertyId: 'BH-005-DEMO',
        surveyNumber: 'SN-2024-005',
        ownerName: primaryUser.fullName,
        district: 'Khurda',
        state: 'Odisha',
        pincode: '751002',
        area: 1800,
        landType: 'residential',
        status: 'verified',
        ipfsHash: 'QmDemoHash005',
        transactionHash: '0xDEMO0005',
        blockchainVerified: true,
      },
    },
  ]);
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
