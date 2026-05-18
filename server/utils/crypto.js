import crypto from 'crypto';

const AADHAAR_SALT = process.env.AADHAAR_SALT || 'bhumi-aadhaar-salt-change-in-production';

export const hashAadhaar = (aadhaar) => {
  return crypto
    .createHmac('sha256', AADHAAR_SALT)
    .update(aadhaar.replace(/\s/g, ''))
    .digest('hex');
};

export const maskAadhaar = (aadhaar) => {
  if (!aadhaar || aadhaar.length < 4) return '****';
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
};

/** Verhoeff checksum (UIDAI Aadhaar standard) */
export const validateAadhaar = (aadhaar) => {
  const cleaned = aadhaar.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(cleaned)) return false;
  if (!/^[2-9]/.test(cleaned)) return false;

  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ];
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];

  let c = 0;
  const digits = cleaned.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return c === 0;
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const generatePropertyId = () => {
  const prefix = 'BH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};
