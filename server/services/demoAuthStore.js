import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { hashAadhaar, maskAadhaar } from '../utils/crypto.js';
import { generateToken } from '../utils/jwt.js';

/** In-memory users when MongoDB is unavailable (presentation / local dev) */
const demoUsers = new Map();

const BUILTIN_ACCOUNTS = [
  {
    email: 'rajesh@example.com',
    password: 'Owner@123',
    fullName: 'Rajesh Kumar',
    phone: '9876543210',
    role: 'owner',
    aadhaar: '234567890124',
  },
  {
    email: 'official@bhumi.gov.in',
    password: 'Official@123',
    fullName: 'Dr. Priya Sharma',
    phone: '9123456789',
    role: 'government_official',
    aadhaar: '345678901238',
  },
  {
    email: 'verifier@bhumi.gov.in',
    password: 'Verifier@123',
    fullName: 'Amit Patel',
    phone: '9988776655',
    role: 'verifier',
    aadhaar: '456789012341',
  },
  {
    email: 'demo.buyer@example.com',
    password: 'Demo@1234',
    fullName: 'Demo Buyer',
    phone: '9123456781',
    role: 'owner',
    aadhaar: '567890123456',
  },
];

const toPublicUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  aadhaarMasked: maskAadhaar(user.aadhaarLast4),
  role: user.role,
  walletAddress: user.walletAddress,
  avatarInitials: user.avatarInitials,
  notificationPreferences: user.notificationPreferences || { email: true, push: true, sms: false },
  language: user.language || 'en',
  demo: true,
});

export const getDemoUserById = (id) => demoUsers.get(id) || null;

export const getDemoUserByEmail = (email) => {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  return [...demoUsers.values()].find((u) => u.email === normalizedEmail) || null;
};

export const getDemoUserByAadhaarHash = (aadhaarHash) =>
  [...demoUsers.values()].find((u) => u.aadhaarHash === aadhaarHash) || null;

export const registerDemoUser = async ({ fullName, email, phone, aadhaar, password, role }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const aadhaarHash = hashAadhaar(aadhaar);
  const aadhaarLast4 = aadhaar.replace(/\D/g, '').slice(-4);

  for (const u of demoUsers.values()) {
    if (u.email === normalizedEmail) {
      return { error: 'Email already registered' };
    }
    if (u.aadhaarHash === aadhaarHash) {
      return { error: 'Aadhaar already registered' };
    }
  }

  const id = `demo:${randomUUID()}`;
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = {
    id,
    _id: id,
    fullName,
    email: normalizedEmail,
    phone,
    aadhaarHash,
    aadhaarLast4,
    password: hashedPassword,
    role,
    walletAddress: '',
    avatarInitials: fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    notificationPreferences: { email: true, push: true, sms: false },
    language: 'en',
    isActive: true,
    comparePassword: async (candidate) => bcrypt.compare(candidate, hashedPassword),
  };

  demoUsers.set(id, user);

  const token = generateToken(id, role);
  return { user: toPublicUser(user), token };
};

export const loginDemoUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = [...demoUsers.values()].find((u) => u.email === normalizedEmail);

  if (!user || !(await user.comparePassword(password))) {
    return { error: 'Invalid email or password' };
  }

  const token = generateToken(user.id, user.role);
  return { user: toPublicUser(user), token };
};

export const demoAuthActive = () => demoUsers.size > 0;

/** Create your account from REGISTRY_PRIMARY_* in .env when MongoDB is down */
export const initPrimaryAccountFromEnv = async () => {
  const email = process.env.REGISTRY_PRIMARY_EMAIL?.trim().toLowerCase();
  if (!email) return;

  const existing = [...demoUsers.values()].find((u) => u.email === email);
  if (existing) {
    console.log(`Primary account ready (offline): ${email}`);
    return;
  }

  const aadhaar = (process.env.REGISTRY_PRIMARY_AADHAAR || '871611719086').replace(/\D/g, '');
  const result = await registerDemoUser({
    fullName: (process.env.REGISTRY_PRIMARY_FULL_NAME || 'Primary Owner').trim(),
    email,
    phone: process.env.REGISTRY_PRIMARY_PHONE || '9876543210',
    aadhaar,
    password: process.env.REGISTRY_PRIMARY_PASSWORD || 'Owner@123',
    role: 'owner',
  });

  if (result.error) {
    console.warn('Primary offline account:', result.error);
  } else {
    console.log(`✓ Primary account ready (offline): ${email}`);
  }
};

export const initBuiltinDemoAccounts = async () => {
  await initPrimaryAccountFromEnv();
  for (const acc of BUILTIN_ACCOUNTS) {
    const existing = [...demoUsers.values()].find((u) => u.email === acc.email);
    if (existing) continue;
    const result = await registerDemoUser({
      fullName: acc.fullName,
      email: acc.email,
      phone: acc.phone,
      aadhaar: acc.aadhaar,
      password: acc.password,
      role: acc.role,
    });
    if (result.error) {
      console.warn(`Demo account skip ${acc.email}:`, result.error);
    }
  }
  console.log(`Demo auth ready (${demoUsers.size} in-memory accounts for offline mode)`);
};
