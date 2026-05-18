import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/bhumi');
  const count = await User.countDocuments();
  await mongoose.disconnect();

  if (count > 0) {
    console.log('Database already has users, skipping import.');
    process.exit(0);
  }

  const datasetPath =
    process.env.DATASET_XLSX_PATH ||
    path.join(__dirname, '..', '..', 'data', 'land_registry_dataset_10000.xlsx');

  const script = fs.existsSync(datasetPath)
    ? 'scripts/importLandRegistryDataset.js'
    : 'utils/seed.js';

  console.log(fs.existsSync(datasetPath)
    ? 'Empty DB — importing 10,000 property dataset...'
    : 'Empty DB — running default seed...');

  const { spawn } = await import('child_process');
  const child = spawn('node', [script], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  child.on('exit', (code) => process.exit(code ?? 0));
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
