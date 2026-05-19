/**
 * One-step setup: import dataset with REGISTRY_PRIMARY_* from .env
 * Run after MongoDB Atlas IP is whitelisted (or local MongoDB is running).
 *
 *   npm run setup:primary
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const email = process.env.REGISTRY_PRIMARY_EMAIL;

if (!email) {
  console.error('Set REGISTRY_PRIMARY_EMAIL in bhumi/.env first.');
  process.exit(1);
}

console.log(`\nImporting all properties for: ${email}\n`);

const child = spawn('node', ['scripts/importLandRegistryDataset.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));
