#!/usr/bin/env node
/**
 * Assign half of properties in MongoDB to an existing user (by email).
 * Usage:
 *   ASSIGN_OWNER_EMAIL=you@gmail.com npm run assign:half
 *   or
 *   ASSIGN_OWNER_EMAIL=you@gmail.com node scripts/assignHalfPropertiesToEmail.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const run = async () => {
  const email = (process.env.ASSIGN_OWNER_EMAIL || process.env.REGISTRY_PRIMARY_EMAIL || '').trim().toLowerCase();
  if (!email) {
    console.error('Set ASSIGN_OWNER_EMAIL=your@gmail.com in .env or on the command line.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bhumi');
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    console.error('Register that account in Bhumi first, or run import:dataset with REGISTRY_PRIMARY_EMAIL set.');
    process.exit(1);
  }

  const total = await Property.countDocuments();
  if (total === 0) {
    console.log('No properties found in database.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const percent = Number(process.env.ASSIGN_PERCENT || 50);
  const take = Math.floor((percent / 100) * total);

  console.log(`Found ${total} properties. Assigning ${take} (${percent}%) to ${email}...`);

  const props = await Property.find({}, { _id: 1 }).lean().exec();
  const ids = props.map((p) => p._id.toString());
  shuffle(ids);
  const selected = ids.slice(0, take);

  if (selected.length === 0) {
    console.log('No properties selected to assign.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const result = await Property.updateMany({ _id: { $in: selected } }, { $set: { owner: user._id, ownerName: user.fullName } });
  const assignedTotal = await Property.countDocuments({ owner: user._id });

  console.log(`✓ Assigned ${result.modifiedCount} properties to ${email}`);
  console.log(`  Total properties now on account: ${assignedTotal}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
