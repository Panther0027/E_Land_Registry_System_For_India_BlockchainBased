import { Router } from 'express';
import {
  register,
  login,
  verifyRegistration,
  getProfile,
  updateProfile,
  linkWallet,
  lookupOwnerByAadhaar,
  registerValidation,
  verifyRegistrationValidation,
  loginValidation,
  validate,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerValidation, validate, register);
router.post('/verify-registration', verifyRegistrationValidation, validate, verifyRegistration);
router.post('/login', loginValidation, validate, login);
router.get('/profile', protect, getProfile);
router.get('/lookup-owner', protect, lookupOwnerByAadhaar);
router.put('/profile', protect, updateProfile);
router.put('/wallet', protect, linkWallet);

export default router;
