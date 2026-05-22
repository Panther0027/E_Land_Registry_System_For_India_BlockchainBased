import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const API = `http://localhost:${process.env.PORT || 5000}/api`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function registerBuyer() {
  const email = `demo.buyer.${Date.now()}@example.com`;
  const body = {
    fullName: 'Demo Buyer',
    email,
    phone: '9123456789',
    aadhaar: '123412341234',
    password: 'Buyer@1234',
    confirmPassword: 'Buyer@1234',
    role: 'owner',
  };
  const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.success) throw new Error(`Register buyer failed: ${j.message}`);
  return j.data.token;
}

async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (!j.success) throw new Error(`Login failed: ${j.message}`);
  return j.data.token;
}

async function importDataset() {
  console.log('Running import dataset (this may take a while)...');
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    const p = exec('npm run import:dataset', { cwd: path.join(__dirname, '..') }, (err, stdout, stderr) => {
      if (err) return reject(err);
      console.log(stdout);
      resolve();
    });
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
  });
}

async function run() {
  try {
    // import dataset
    await importDataset();

    // register buyer
    console.log('Calling: POST /auth/register');
    const buyerToken = await registerBuyer();
    console.log('Buyer token:', buyerToken.slice(0, 20), '...');

    // login owner (primary from env)
    console.log('Calling: POST /auth/login (owner)');
    const ownerToken = await login(process.env.REGISTRY_PRIMARY_EMAIL, process.env.REGISTRY_PRIMARY_PASSWORD);
    console.log('Owner token acquired');

    // fetch available properties as buyer
    console.log('Calling: GET /property/available');
      const r1 = await fetch(`${API}/property/available`, { headers: { Authorization: `Bearer ${buyerToken}` } });
      const txt1 = await r1.text();
      let j1;
      try { j1 = JSON.parse(txt1); } catch (e) { throw new Error(`Failed to parse available properties response: ${r1.status} ${txt1}`); }
      if (!j1.success) throw new Error(`Failed to fetch available properties: ${r1.status} ${j1.message || JSON.stringify(j1)}`);
    const prop = j1.data[0];
    console.log('Selected property:', prop.propertyId);

    // create purchase request
    console.log('Calling: POST /property/request');
    const r2 = await fetch(`${API}/property/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` }, body: JSON.stringify({ propertyId: prop.propertyId, message: 'I want to buy this property' }) });
    const j2 = await r2.json();
    console.log('Create request response:', j2.message || j2);

    // wait a moment
    await sleep(2000);

    // owner lists requests
    console.log('Calling: GET /property/requests/owner');
    const r3 = await fetch(`${API}/property/requests/owner`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const j3 = await r3.json();
    console.log('Owner requests count:', j3.data.length);
    const req = j3.data.find((x) => x.propertyId === prop.propertyId);
    if (!req) throw new Error('Request not found for owner');

    // owner approve
    console.log(`Calling: POST /property/requests/${req._id}/approve`);
    const r4 = await fetch(`${API}/property/requests/${req._id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` } });
    const j4 = await r4.json();
    console.log('Approve response:', j4.message || j4);

    console.log('E2E demo completed');
  } catch (err) {
    console.error('E2E error:', err);
  }
}

run();
