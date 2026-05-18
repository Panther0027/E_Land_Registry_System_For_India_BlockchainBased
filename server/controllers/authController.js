import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { hashAadhaar, maskAadhaar, validateAadhaar } from '../utils/crypto.js';
import { generateToken } from '../utils/jwt.js';
import { ethers } from 'ethers';
import { isDbConnected } from '../config/db.js';
import { isDemoModeEnabled } from '../config/appConfig.js';
import { registerDemoUser, loginDemoUser } from '../services/demoAuthStore.js';

export const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone required'),
  body('aadhaar').custom((value) => {
    if (!validateAadhaar(value)) throw new Error('Invalid Aadhaar number');
    return true;
  }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  body('role').isIn(['owner', 'government_official', 'verifier']).withMessage('Invalid role'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

const formatUserResponse = (user, token, extra = {}) => ({
  success: true,
  message: 'Registration successful',
  ...extra,
  data: {
    token,
    user: {
      id: user._id ?? user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      aadhaarMasked: user.aadhaarMasked ?? maskAadhaar(user.aadhaarLast4),
      role: user.role,
      walletAddress: user.walletAddress,
      avatarInitials: user.avatarInitials,
      ...(user.demo && { demo: true }),
    },
  },
});

export const register = async (req, res, next) => {
  try {
    const { fullName, email, phone, aadhaar, password, role } = req.body;
    const cleanAadhaar = aadhaar.replace(/\D/g, '');

    if (!isDbConnected() && isDemoModeEnabled()) {
      const demoResult = await registerDemoUser({
        fullName,
        email,
        phone,
        aadhaar: cleanAadhaar,
        password,
        role,
      });
      if (demoResult.error) {
        return res.status(400).json({ success: false, message: demoResult.error });
      }
      return res.status(201).json(
        formatUserResponse(demoResult.user, demoResult.token, {
          message: 'Registration successful (demo mode — MongoDB not connected)',
        })
      );
    }

    const aadhaarHash = hashAadhaar(cleanAadhaar);
    const aadhaarLast4 = cleanAadhaar.slice(-4);

    let existingUser = null;
    try {
      existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { aadhaarHash }],
      });
    } catch (dbErr) {
      if (isDemoModeEnabled()) {
        console.warn('DB lookup failed, using demo auth:', dbErr.message);
        const demoResult = await registerDemoUser({
          fullName,
          email,
          phone,
          aadhaar: cleanAadhaar,
          password,
          role,
        });
        if (demoResult.error) {
          return res.status(400).json({ success: false, message: demoResult.error });
        }
        return res.status(201).json(
          formatUserResponse(demoResult.user, demoResult.token, {
            message: 'Registration successful (demo mode)',
          })
        );
      }
      throw dbErr;
    }

    if (existingUser) {
      const isEmail = existingUser.email === email.toLowerCase();
      return res.status(400).json({
        success: false,
        message: isEmail
          ? 'Email already registered — try logging in instead'
          : 'This Aadhaar is already registered. Use a new Aadhaar or login with your existing account (e.g. rajesh@example.com / Owner@123)',
      });
    }

    const wallet = ethers.Wallet.createRandom();

    const user = await User.create({
      fullName,
      email,
      phone,
      aadhaarHash,
      aadhaarLast4,
      password,
      role,
      walletAddress: wallet.address,
      avatarInitials: fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json(formatUserResponse(user, token));
  } catch (error) {
    if (isDemoModeEnabled() && (!isDbConnected() || error.name === 'MongooseError' || error.message?.includes('buffering'))) {
      try {
        const { fullName, email, phone, aadhaar, password, role } = req.body;
        const demoResult = await registerDemoUser({
          fullName,
          email,
          phone,
          aadhaar: aadhaar.replace(/\D/g, ''),
          password,
          role,
        });
        if (demoResult.error) {
          return res.status(400).json({ success: false, message: demoResult.error });
        }
        return res.status(201).json(
          formatUserResponse(demoResult.user, demoResult.token, {
            message: 'Registration successful (demo mode)',
          })
        );
      } catch {
        /* fall through */
      }
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!isDbConnected() && isDemoModeEnabled()) {
      const demoResult = await loginDemoUser({ email, password });
      if (demoResult.error) {
        return res.status(401).json({ success: false, message: demoResult.error });
      }
      return res.json({
        success: true,
        message: 'Login successful (demo mode)',
        data: { token: demoResult.token, user: demoResult.user },
      });
    }

    let user;
    try {
      user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    } catch (dbErr) {
      if (isDemoModeEnabled()) {
        const demoResult = await loginDemoUser({ email, password });
        if (demoResult.error) {
          return res.status(401).json({ success: false, message: demoResult.error });
        }
        return res.json({
          success: true,
          message: 'Login successful (demo mode)',
          data: { token: demoResult.token, user: demoResult.user },
        });
      }
      throw dbErr;
    }

    if (!user || !(await user.comparePassword(password))) {
      if (isDemoModeEnabled()) {
        const demoResult = await loginDemoUser({ email, password });
        if (demoResult.user) {
          return res.json({
            success: true,
            message: 'Login successful (demo mode)',
            data: { token: demoResult.token, user: demoResult.user },
          });
        }
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          aadhaarMasked: maskAadhaar(user.aadhaarLast4),
          role: user.role,
          walletAddress: user.walletAddress,
          avatarInitials: user.avatarInitials,
          notificationPreferences: user.notificationPreferences,
          language: user.language,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        aadhaarMasked: maskAadhaar(user.aadhaarLast4),
        role: user.role,
        walletAddress: user.walletAddress,
        avatarInitials: user.avatarInitials,
        notificationPreferences: user.notificationPreferences,
        language: user.language,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, notificationPreferences, language } = req.body;
    const updates = {};

    if (fullName) {
      updates.fullName = fullName;
      updates.avatarInitials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (phone) updates.phone = phone;
    if (notificationPreferences) updates.notificationPreferences = notificationPreferences;
    if (language) updates.language = language;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Profile updated',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const linkWallet = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid Ethereum wallet address' });
    }

    const existing = await User.findOne({ walletAddress, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Wallet already linked to another account' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { walletAddress },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Wallet linked successfully',
      data: { walletAddress: user.walletAddress },
    });
  } catch (error) {
    next(error);
  }
};
