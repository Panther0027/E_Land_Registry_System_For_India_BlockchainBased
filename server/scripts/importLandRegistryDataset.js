/**
 * Import land_registry_dataset_10000.xlsx into MongoDB.
 *
 * Usage:
 *   DATASET_XLSX_PATH=../data/land_registry_dataset_10000.xlsx npm run import:dataset
 *
 * Optional .env — assign ALL 10,000 properties to your account:
 *   REGISTRY_PRIMARY_EMAIL=you@gmail.com
 *   REGISTRY_PRIMARY_PASSWORD=YourPass@123
 *   REGISTRY_PRIMARY_FULL_NAME=Your Full Name
 *   REGISTRY_PRIMARY_PHONE=9876543210
 *   REGISTRY_PRIMARY_AADHAAR=789012345674
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { ethers } from 'ethers';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { hashAadhaar } from '../utils/crypto.js';
import { generateAadhaarFromSeed } from '../utils/aadhaarGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const DEFAULT_PASSWORD = process.env.DEFAULT_IMPORT_PASSWORD || 'Bhumi@2026';
const GOV_PASSWORD = process.env.GOV_IMPORT_PASSWORD || 'BhumiGov@2026';

const LOCATION_META = {
  Bhubaneswar: { pincode: '751001', state: 'Odisha' },
  Balasore: { pincode: '756001', state: 'Odisha' },
  Puri: { pincode: '752001', state: 'Odisha' },
  Cuttack: { pincode: '753001', state: 'Odisha' },
  Rourkela: { pincode: '769001', state: 'Odisha' },
  Sambalpur: { pincode: '768001', state: 'Odisha' },
};

const landTypeFromArea = (sqft) => {
  if (sqft >= 4000) return 'agricultural';
  if (sqft >= 2000) return 'commercial';
  return 'residential';
};

const statusFromTxCount = (tx) => {
  if (tx >= 8) return 'verified';
  if (tx >= 5) return 'verified';
  if (tx <= 2) return 'pending';
  return 'verified';
};

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');

const readDataset = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset not found: ${filePath}`);
  }
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
};

const run = async () => {
  const datasetPath =
    process.env.DATASET_XLSX_PATH ||
    path.join(__dirname, '..', '..', 'data', 'land_registry_dataset_10000.xlsx');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bhumi');
  console.log('Connected to MongoDB');
  console.log('Reading dataset:', datasetPath);

  const rows = readDataset(datasetPath);
  console.log(`Loaded ${rows.length} property records`);

  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Transaction.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const official = await User.create({
    fullName: process.env.GOV_FULL_NAME || 'Registry Government Official',
    email: (process.env.GOV_EMAIL || 'gov.official@landregistry.bhumi').toLowerCase(),
    phone: process.env.GOV_PHONE || '9123456789',
    aadhaarHash: hashAadhaar(generateAadhaarFromSeed('gov-official')),
    aadhaarLast4: '0001',
    password: GOV_PASSWORD,
    role: 'government_official',
    walletAddress: ethers.Wallet.createRandom().address,
    avatarInitials: 'GO',
  });

  const verifier = await User.create({
    fullName: 'Registry Verifier',
    email: (process.env.VERIFIER_EMAIL || 'verifier@landregistry.bhumi').toLowerCase(),
    phone: '9988776655',
    aadhaarHash: hashAadhaar(generateAadhaarFromSeed('verifier')),
    aadhaarLast4: '0002',
    password: GOV_PASSWORD,
    role: 'verifier',
    walletAddress: ethers.Wallet.createRandom().address,
    avatarInitials: 'RV',
  });

  const ownerMap = new Map();
  const uniqueOwners = [...new Set(rows.map((r) => r.OwnerName))];

  let primaryUser = null;
  if (process.env.REGISTRY_PRIMARY_EMAIL) {
    const aadhaar = (process.env.REGISTRY_PRIMARY_AADHAAR || generateAadhaarFromSeed('primary')).replace(/\D/g, '');
    primaryUser = await User.create({
      fullName: process.env.REGISTRY_PRIMARY_FULL_NAME || 'Primary Registry Owner',
      email: process.env.REGISTRY_PRIMARY_EMAIL.toLowerCase(),
      phone: process.env.REGISTRY_PRIMARY_PHONE || '9876543210',
      aadhaarHash: hashAadhaar(aadhaar),
      aadhaarLast4: aadhaar.slice(-4),
      password: process.env.REGISTRY_PRIMARY_PASSWORD || DEFAULT_PASSWORD,
      role: 'owner',
      walletAddress: ethers.Wallet.createRandom().address,
      avatarInitials: 'PO',
    });
    console.log(`Primary owner: ${primaryUser.email} (all ${rows.length} properties)`);
  }

  for (const name of uniqueOwners) {
    if (primaryUser) {
      ownerMap.set(name, primaryUser);
      continue;
    }
    const aadhaar = generateAadhaarFromSeed(`owner-${name}`);
    const email = `${slugify(name)}@landregistry.bhumi`;
    const user = await User.create({
      fullName: name,
      email,
      phone: String(6000000000 + (Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 3999999999)),
      aadhaarHash: hashAadhaar(aadhaar),
      aadhaarLast4: aadhaar.slice(-4),
      password: DEFAULT_PASSWORD,
      role: 'owner',
      walletAddress: ethers.Wallet.createRandom().address,
      avatarInitials: name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    });
    ownerMap.set(name, user);
  }

  const propertyDocs = [];
  const BATCH = 500;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawId = String(row.PropertyID || row.propertyId || i).trim();
    const propertyId = `LR-${rawId.toUpperCase()}`;
    const owner = ownerMap.get(row.OwnerName);
    const loc = row.Location || 'Bhubaneswar';
    const meta = LOCATION_META[loc] || LOCATION_META.Bhubaneswar;
    const area = Math.round(Number(row.LandSize_sqft) || 1000);
    const txCount = Number(row.TransactionCount) || 1;
    const status = statusFromTxCount(txCount);
    const ipfsHash = String(row.IPFS_Hash || row.ipfs_hash || `QmDataset${rawId}`);

    propertyDocs.push({
      propertyId,
      surveyNumber: `SN-${rawId.toUpperCase()}`,
      owner: owner._id,
      ownerAadhaarHash: owner.aadhaarHash,
      ownerName: owner.fullName,
      district: loc,
      state: meta.state,
      pincode: meta.pincode,
      area,
      landType: landTypeFromArea(area),
      status,
      ipfsHash,
      blockchainVerified: status === 'verified',
      verifiedBy: status === 'verified' ? official._id : undefined,
      verifiedAt: status === 'verified' ? new Date() : undefined,
      transactionHash: `0x${rawId}dataset${i}`,
      documents: [
        { name: `deed_${rawId}.pdf`, type: 'deed', ipfsHash },
        { name: `proof_${rawId}.jpg`, type: 'ownership_proof', ipfsHash: `${ipfsHash}-proof` },
      ],
    });

    if (propertyDocs.length >= BATCH || i === rows.length - 1) {
      await Property.insertMany(propertyDocs, { ordered: false });
      process.stdout.write(`\rImported ${i + 1}/${rows.length} properties`);
      propertyDocs.length = 0;
    }
  }

  console.log('\n\nImport complete.\n');
  console.log('=== LOGIN CREDENTIALS (real MongoDB accounts) ===\n');
  console.log('Government official (verify properties):');
  console.log(`  Email:    ${official.email}`);
  console.log(`  Password: ${GOV_PASSWORD}\n`);
  console.log('Verifier:');
  console.log(`  Email:    ${verifier.email}`);
  console.log(`  Password: ${GOV_PASSWORD}\n`);

  if (primaryUser) {
    console.log('Your primary owner account (ALL properties):');
    console.log(`  Email:    ${primaryUser.email}`);
    console.log(`  Password: ${process.env.REGISTRY_PRIMARY_PASSWORD || DEFAULT_PASSWORD}`);
    console.log(`  Aadhaar:  ${process.env.REGISTRY_PRIMARY_AADHAAR || '(see .env)'}\n`);
  } else {
    console.log('Property owners (split by dataset OwnerName):');
    console.log(`  Password for all: ${DEFAULT_PASSWORD}\n`);
    for (const [name, user] of ownerMap) {
      console.log(`  ${name.padEnd(16)} → ${user.email}`);
    }
  }

  console.log('\nSample property IDs: LR-7D185238, LR-D661644F (from dataset)');
  console.log('Set REGISTRY_PRIMARY_EMAIL in .env to assign all properties to your email.\n');

  const credPath = path.join(__dirname, '..', '..', 'IMPORTED_CREDENTIALS.txt');
  const lines = [
    'Bhumi — Imported dataset credentials',
    '=====================================',
    '',
    `Government: ${official.email} / ${GOV_PASSWORD}`,
    `Verifier:   ${verifier.email} / ${GOV_PASSWORD}`,
    '',
  ];
  if (primaryUser) {
    lines.push(`Primary owner (all 10000 properties): ${primaryUser.email} / ${process.env.REGISTRY_PRIMARY_PASSWORD || DEFAULT_PASSWORD}`);
  } else {
    lines.push(`Owner password: ${DEFAULT_PASSWORD}`);
    for (const [, user] of ownerMap) {
      lines.push(`  ${user.fullName}: ${user.email}`);
    }
  }
  fs.writeFileSync(credPath, lines.join('\n'));
  console.log(`Credentials saved to: ${credPath}`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
