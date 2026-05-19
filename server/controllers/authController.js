import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { hashAadhaar, maskAadhaar, validateAadhaar } from '../utils/crypto.js';
import { generateToken } from '../utils/jwt.js';
import { ethers } from 'ethers';
import { isDemoModeEnabled, isOfflineMode } from '../config/appConfig.js';
import { isDbConnected } from '../config/db.js';
import { ensureDbConnection } from '../utils/ensureDb.js';

import { registerDemoUser, loginDemoUser } from '../services/demoAuthStore.js';

const allowDemoAuth = () => isDemoModeEnabled() || isOfflineMode();

const dbUnavailableResponse = (res) =>
  res.status(503).json({
    success: false,
    message:
      'Database is not available. Start MongoDB (or run: docker compose up -d) and try again.',
  });

const toAuthUser = (user) => ({
  id: user._id ?? user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  aadhaarMasked: user.aadhaarMasked ?? maskAadhaar(user.aadhaarLast4),
  role: user.role,
  walletAddress: user.walletAddress || '',
  avatarInitials:
    user.avatarInitials ||
    user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
});

export const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone required'),
  body('aadhaar').custom((value) => {
    if (!validateAadhaar(value)) throw new Error('Enter a valid 12-digit Aadhaar number');
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
    const normalizedEmail = email.trim().toLowerCase();

    const dbReady = await ensureDbConnection();

    if (!dbReady) {
      if (allowDemoAuth()) {
        const demoResult = await registerDemoUser({
          fullName,
          email: normalizedEmail,
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
            message: 'Account created (offline demo — connect MongoDB for permanent storage)',
          })
        );
      }
      return dbUnavailableResponse(res);
    }

    const aadhaarHash = hashAadhaar(cleanAadhaar);
    const aadhaarLast4 = cleanAadhaar.slice(-4);

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { aadhaarHash }],
    });

    if (existingUser) {
      const isEmail = existingUser.email === normalizedEmail;
      return res.status(400).json({
        success: false,
        message: isEmail
          ? 'This email is already registered — please log in instead'
          : 'This Aadhaar number is already registered — log in or use a different Aadhaar',
      });
    }

    const wallet = ethers.Wallet.createRandom();

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone,
      aadhaarHash,
      aadhaarLast4,
      password,
      role,
      walletAddress: wallet.address,
      avatarInitials: fullName
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: toAuthUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const dbReady = await ensureDbConnection();

    if (!dbReady) {
      if (allowDemoAuth()) {
        const demoResult = await loginDemoUser({ email: normalizedEmail, password });
        if (demoResult.error) {
          return res.status(401).json({ success: false, message: demoResult.error });
        }
        return res.json({
          success: true,
          message: 'Login successful',
          data: { token: demoResult.token, user: demoResult.user },
        });
      }
      return dbUnavailableResponse(res);
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
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
          ...toAuthUser(user),
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

/** Look up a registered user by Aadhaar (for transfer — shows name from database). */
export const lookupOwnerByAadhaar = async (req, res, next) => {
  try {
    const raw = String(req.query.aadhaar || '').replace(/\D/g, '');
    if (!validateAadhaar(raw)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 12-digit Aadhaar' });
    }

    if (!(await ensureDbConnection()) || !isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database required to look up owners. Connect MongoDB first.',
      });
    }

    const aadhaarHash = hashAadhaar(raw);
    const user = await User.findOne({ aadhaarHash }).select('fullName email role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No Bhumi account for this Aadhaar. Ask them to register first.',
      });
    }

    res.json({
      success: true,
      data: { fullName: user.fullName, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};
