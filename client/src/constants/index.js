export const COLORS = {
  primary: '#1B4332',
  secondary: '#D4A017',
  accent: '#F5F0E8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  success: '#2D6A4F',
  error: '#DC2626',
};

export const ROLES = {
  OWNER: 'owner',
  GOVERNMENT_OFFICIAL: 'government_official',
  VERIFIER: 'verifier',
};

export const ROLE_LABELS = {
  owner: 'Property Owner',
  government_official: 'Government Official',
  verifier: 'Verifier',
};

export const LAND_TYPES = [
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh',
];

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
];

export const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io/tx/';
export const SEPOLIA_ADDRESS_EXPLORER = 'https://sepolia.etherscan.io/address/';

/** Demo IDs for public verification (works without MongoDB seed) */
export const DEMO_PROPERTY_IDS = [
  { id: 'BH-001-KHURDA', label: 'Verified — Khurda', status: 'verified' },
  { id: 'BH-002-CUTTACK', label: 'Pending — Cuttack', status: 'pending' },
  { id: 'BH-003-BBSR', label: 'Verified — Bhubaneswar', status: 'verified' },
  { id: 'BH-004-PURI', label: 'Disputed — Puri', status: 'disputed' },
];

/** Valid Verhoeff Aadhaar — not used by seed accounts; safe for new registration */
export const DEMO_AADHAAR = '7890-1234-5674';

export const DEMO_LOGIN = {
  owner: { email: 'rajesh@example.com', password: 'Owner@123' },
  official: { email: 'official@bhumi.gov.in', password: 'Official@123' },
};

export const ONBOARDING_SLIDES = [
  {
    title: 'Register Land Digitally',
    description: 'Securely register your land records on the blockchain with government-grade security.',
    icon: 'land',
  },
  {
    title: 'Tamper-Proof Records',
    description: 'Every record is immutable and verifiable. No more forged documents or disputed ownership.',
    icon: 'shield',
  },
  {
    title: 'Transfer Ownership Instantly',
    description: 'Transfer property ownership securely with blockchain-verified transactions.',
    icon: 'handshake',
  },
];
