/**
 * Registers demo property IDs on Sepolia (if not already present).
 * Run: npm run seed:blockchain
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBlockchain } from '../config/blockchain.js';
import { DEMO_PROPERTIES } from '../data/demoProperties.js';
import { hashAadhaar } from '../utils/crypto.js';
import {
  getPropertyFromChain,
  registerPropertyOnChain,
  verifyPropertyOnChain,
  raiseDisputeOnChain,
} from '../services/blockchainService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const OWNER_HASH = hashAadhaar('234567890124');

const plan = [
  { property: DEMO_PROPERTIES[0], verify: true },
  { property: DEMO_PROPERTIES[1], verify: false },
  { property: DEMO_PROPERTIES[2], verify: true },
  { property: DEMO_PROPERTIES[3], verify: true, dispute: true },
];

const run = async () => {
  const contract = initBlockchain();
  if (!contract) {
    console.error('Blockchain not configured. Set SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS in .env');
    process.exit(1);
  }

  console.log('Seeding demo properties on Sepolia...\n');

  for (const { property, verify, dispute } of plan) {
    const { propertyId, district, state, area, ipfsHash } = property;
    const location = `${district}, ${state}`;

    const existing = await getPropertyFromChain(propertyId);
    if (existing) {
      console.log(`⏭  ${propertyId} already on-chain (${existing.status})`);
    } else {
      console.log(`📝 Registering ${propertyId}...`);
      const reg = await registerPropertyOnChain(propertyId, OWNER_HASH, location, area, ipfsHash);
      console.log(`   tx: ${reg.txHash}`);
    }

    if (verify) {
      const current = await getPropertyFromChain(propertyId);
      if (current?.status === 'pending') {
        console.log(`✅ Verifying ${propertyId}...`);
        const v = await verifyPropertyOnChain(propertyId);
        console.log(`   tx: ${v.txHash}`);
      }
    }

    if (dispute) {
      const current = await getPropertyFromChain(propertyId);
      if (current?.status === 'verified') {
        console.log(`⚠️  Raising dispute on ${propertyId}...`);
        const d = await raiseDisputeOnChain(propertyId, 'Boundary dispute — demo seed');
        console.log(`   tx: ${d.txHash}`);
      }
    }
  }

  console.log('\n✅ Demo blockchain seed complete. Try "Verify on Blockchain" for BH-001-KHURDA.\n');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
