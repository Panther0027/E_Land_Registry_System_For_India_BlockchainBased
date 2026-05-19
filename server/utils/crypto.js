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

/** Accept any 12-digit Aadhaar (format check only — open registration). */
export const validateAadhaar = (aadhaar) => {
  const cleaned = String(aadhaar || '').replace(/[\s-]/g, '');
  return /^\d{12}$/.test(cleaned);
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const generatePropertyId = () => {
  const prefix = 'BH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};
