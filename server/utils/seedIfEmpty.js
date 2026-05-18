import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/bhumi');
  const count = await User.countDocuments();
  await mongoose.disconnect();

  if (count > 0) {
    console.log('Database already seeded, skipping.');
    process.exit(0);
  }

  console.log('Empty database — running full seed...');
  const { spawn } = await import('child_process');
  const child = spawn('node', ['utils/seed.js'], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  child.on('exit', (code) => process.exit(code ?? 0));
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
