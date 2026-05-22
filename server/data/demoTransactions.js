/** In-memory transactions for demo / offline mode */
const byProperty = new Map();
const byUser = new Map();

export const addDemoTransaction = (tx) => {
  const entry = {
    _id: `demo-tx-${Date.now().toString(16)}-${Math.random().toString(36).slice(2,6)}`,
    propertyId: tx.propertyId,
    actionType: tx.actionType || 'UNKNOWN',
    txHash: tx.txHash || tx.transactionHash || '',
    initiatedBy: tx.initiatedBy || tx.userId || null,
    status: tx.status || 'confirmed',
    details: tx.details || {},
    createdAt: tx.createdAt || new Date(),
  };

  const pList = byProperty.get(entry.propertyId) || [];
  pList.unshift(entry);
  byProperty.set(entry.propertyId, pList);

  if (entry.initiatedBy) {
    const uList = byUser.get(entry.initiatedBy) || [];
    uList.unshift(entry);
    byUser.set(entry.initiatedBy, uList);
  }

  return entry;
};

export const getDemoTransactionsForProperty = (propertyId) => byProperty.get(propertyId) || [];

export const getDemoTransactionsForUser = (userId, limit = 50) => {
  const list = byUser.get(userId) || [];
  return list.slice(0, limit);
};

export const getRecentDemoTransactions = (limit = 10) => {
  const all = Array.from(byProperty.values()).flat();
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return all.slice(0, limit);
};

export default {
  addDemoTransaction,
  getDemoTransactionsForProperty,
  getDemoTransactionsForUser,
  getRecentDemoTransactions,
};
