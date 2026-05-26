import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isDbConnected } from '../config/db.js';
import { getDemoUserById } from '../services/demoAuthStore.js';
import { supabaseAdmin } from '../config/supabase.js';

const validateSupabaseToken = async (token) => {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user;
};

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login.',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (String(decoded.id).startsWith('demo:')) {
        const demoUser = getDemoUserById(decoded.id);
        if (!demoUser || !demoUser.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User not found or deactivated.',
          });
        }
        req.user = demoUser;
        return next();
      }

      if (!isDbConnected()) {
        return res.status(503).json({
          success: false,
          message:
            'Database offline. Log out and sign in again (your account is saved in offline mode while MongoDB is disconnected).',
        });
      }

      const user = await User.findById(decoded.id).select('-password');

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or deactivated.',
        });
      }

      req.user = user;
      return next();
    } catch (jwtError) {
      const supabaseUser = await validateSupabaseToken(token);
      if (!supabaseUser) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token.',
        });
      }

      if (!isDbConnected()) {
        return res.status(503).json({
          success: false,
          message:
            'Database offline. Log out and sign in again (your account is saved in offline mode while MongoDB is disconnected).',
        });
      }

      const user =
        (supabaseUser.email && (await User.findOne({ email: supabaseUser.email }).select('-password')))
        ||
        (supabaseUser.phone && (await User.findOne({ phone: supabaseUser.phone }).select('-password')));

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or deactivated.',
        });
      }

      req.user = user;
      return next();
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action.`,
      });
    }
    next();
  };
};
