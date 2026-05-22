import 'dotenv/config';

const API = `http://localhost:${process.env.PORT || 5000}/api`;

async function request(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: res.status, data };
}

function randomAadhaar() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

async function main() {
  console.log('Health check');
  console.log(await request('/health'));

  const email = `debug.buyer.${Date.now()}@example.com`;
  const aadhaar = randomAadhaar();
  const reg = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Debug Buyer',
      email,
      phone: '9123456789',
      aadhaar,
      password: 'Buyer@1234',
      confirmPassword: 'Buyer@1234',
      role: 'owner',
    }),
  });
  console.log('Register:', reg);

  if (!reg.data?.data?.token) return;

  const buyerToken = reg.data.data.token;
  const available = await request('/property/available', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  console.log('Available:', available.status, Array.isArray(available.data.data) ? available.data.data.length : available.data);
  const prop = available.data.data?.[0];
  if (!prop) return;

  const requestRes = await request('/property/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` },
    body: JSON.stringify({ propertyId: prop.propertyId, message: 'I want to buy this property' }),
  });
  console.log('Request create:', requestRes);
  if (!requestRes.data?.data?._id) return;

  const ownerEmail = process.env.REGISTRY_PRIMARY_EMAIL || 'pantheraleo870@gmail.com';
  const ownerPassword = process.env.REGISTRY_PRIMARY_PASSWORD || 'Panther@766156';
  const ownerLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
  });
  console.log('Owner login:', ownerLogin);
  const ownerToken = ownerLogin.data?.data?.token;
  if (!ownerToken) return;

  const ownerRequests = await request('/property/requests/owner', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  console.log('Owner requests:', ownerRequests.status, ownerRequests.data?.data?.length);
  const req = ownerRequests.data?.data?.find((r) => r.propertyId === prop.propertyId);
  if (!req) return console.log('Request not found in owner list');

  const approve = await request(`/property/requests/${req._id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  console.log('Approve response:', approve);
}

main().catch((err) => {
  console.error('Script error', err);
  process.exit(1);
});
