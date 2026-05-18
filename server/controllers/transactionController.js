import Transaction from '../models/Transaction.js';

export const getTransactionsByProperty = async (req, res, next) => {
  try {
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
    const transactions = await Transaction.find({ initiatedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};
