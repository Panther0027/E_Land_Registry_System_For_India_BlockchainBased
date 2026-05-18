import crypto from 'crypto';
import { validateAadhaar } from './crypto.js';

/** Deterministic valid Aadhaar from a seed string (for dataset owners) */
export const generateAadhaarFromSeed = (seed) => {
  const hash = crypto.createHash('sha256').update(String(seed)).digest('hex');
  const digits = hash.replace(/\D/g, '').padEnd(11, '0').slice(0, 11);
  const base11 = `2${digits.slice(0, 11)}`.slice(0, 11);

  for (let check = 0; check <= 9; check++) {
    const candidate = `${base11}${check}`;
    if (validateAadhaar(candidate)) return candidate;
  }

  for (let attempt = 0; attempt < 1000; attempt++) {
    const n = (parseInt(hash.slice(0, 8), 16) + attempt) % 100000000000;
    const base = `2${String(n).padStart(11, '0')}`.slice(0, 11);
    for (let check = 0; check <= 9; check++) {
      const candidate = `${base}${check}`;
      if (validateAadhaar(candidate)) return candidate;
    }
  }

  return '789012345674';
};
