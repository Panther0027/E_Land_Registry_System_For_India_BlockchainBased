#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const email = process.argv[2] || process.env.EMAIL_TO_CHECK;
if (!email) {
  console.error('Usage: node scripts/findUser.js user@example.com');
  process.exit(1);
}

const normalized = String(email).trim().toLowerCase();

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bhumi';
    await mongoose.connect(mongoUri, { autoIndex: false });
    console.log('Connected to', mongoUri);

    const user = await User.findOne({ email: normalized }).lean().exec();
    if (!user) {
      console.log('User not found for', normalized);
      process.exit(0);
    }

    const output = {
      _id: String(user._id),
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      isVerified: Boolean(user.isVerified),
      hasPassword: Boolean(user.password),
      walletAddress: user.walletAddress || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(2);
  }
}

main();
