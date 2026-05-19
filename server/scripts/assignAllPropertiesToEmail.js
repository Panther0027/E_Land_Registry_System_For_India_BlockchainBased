/**
 * Assign all properties in MongoDB to an existing user (by email).
 * Does not delete users — only updates property.owner.
 *
 * Usage:
 *   ASSIGN_OWNER_EMAIL=you@gmail.com npm run assign:owner
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

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

  const result = await Property.updateMany({}, { $set: { owner: user._id, ownerName: user.fullName } });
  const total = await Property.countDocuments({ owner: user._id });

  console.log(`\n✓ Assigned ${result.modifiedCount} properties to ${email}`);
  console.log(`  Total properties on account: ${total}`);
  console.log(`  Log in at http://localhost:5173/login with this email.\n`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
