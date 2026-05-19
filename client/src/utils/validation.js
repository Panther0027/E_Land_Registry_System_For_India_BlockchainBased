import { z } from 'zod';
import { validateAadhaar } from './index';

const aadhaarField = z
  .string()
  .min(1, 'Aadhaar number is required')
  .refine((val) => /^\d{4}-?\d{4}-?\d{4}$/.test(val.replace(/\s/g, '')), {
    message: 'Enter valid 12-digit Aadhaar (XXXX-XXXX-XXXX)',
  })
  .refine((val) => validateAadhaar(val), {
    message: 'Enter a valid 12-digit Aadhaar number',
  });

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number'),
  aadhaar: aadhaarField,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must include uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string(),
  role: z.enum(['owner', 'government_official', 'verifier']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const propertyStep1Schema = z.object({
  propertyId: z.string().optional(),
  surveyNumber: z.string().min(1, 'Survey number is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
  area: z.coerce.number().positive('Area must be positive'),
  landType: z.enum(['agricultural', 'residential', 'commercial']),
});

export const propertyStep2Schema = z.object({
  ownerName: z.string().min(2, 'Owner name is required'),
  ownerAadhaar: aadhaarField,
  hasCoOwner: z.boolean(),
  coOwnerName: z.string().optional(),
  coOwnerAadhaar: z.string().optional(),
});

export const transferSchema = z.object({
  propertyId: z.string().min(1, 'Select a property'),
  newOwnerAadhaar: aadhaarField,
  transferReason: z.string().min(10, 'Please provide a reason (min 10 characters)'),
  otp: z.string().length(6, 'Enter 6-digit OTP').optional(),
});

export const searchSchema = z.object({
  propertyId: z.string().optional(),
  surveyNumber: z.string().optional(),
}).refine((data) => data.propertyId || data.surveyNumber, {
  message: 'Enter Property ID or Survey Number',
});
