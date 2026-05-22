import Transaction from '../models/Transaction.js';
import { isDemoModeEnabled } from '../config/appConfig.js';
import { isDbConnected } from '../config/db.js';
import { getDemoTransactionsForProperty, getDemoTransactionsForUser } from '../data/demoTransactions.js';

export const getTransactionsByProperty = async (req, res, next) => {
  try {
    if (isDemoModeEnabled() || !isDbConnected()) {
      const transactions = getDemoTransactionsForProperty(req.params.propertyId);
      return res.json({ success: true, data: transactions });
    }

    const transactions = await Transaction.find({
      propertyId: req.params.propertyId,
    })
      .populate('initiatedBy', 'fullName role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

export const getUserTransactions = async (req, res, next) => {
  try {
    if (isDemoModeEnabled() || !isDbConnected()) {
      const demo = getDemoTransactionsForUser(req.user.id || req.user._id);
      return res.json({ success: true, data: demo });
    }

    const transactions = await Transaction.find({ initiatedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};
