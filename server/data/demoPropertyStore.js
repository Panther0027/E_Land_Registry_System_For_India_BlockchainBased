/** In-memory properties for demo / offline users (no MongoDB). */
const byUser = new Map();
const allIds = new Set();

const getAllDemoProperties = () => Array.from(byUser.values()).flat();

export const isPropertyIdInDemoStore = (propertyId) => allIds.has(propertyId);

export const findDemoPropertyById = (propertyId) => {
  if (!propertyId) return null;
  return getAllDemoProperties().find(
    (p) => p.propertyId.toLowerCase() === propertyId.trim().toLowerCase()
  ) || null;
};

export const findDemoPropertyBySurveyNumber = (surveyNumber) => {
  if (!surveyNumber) return null;
  return getAllDemoProperties().find(
    (p) => p.surveyNumber.toLowerCase() === surveyNumber.trim().toLowerCase()
  ) || null;
};

export const findDemoPropertyForOwner = (userId, propertyId) => {
  const list = byUser.get(userId) || [];
  return list.find(
    (p) => p.propertyId.toLowerCase() === propertyId.trim().toLowerCase()
  ) || null;
};

export const verifyDemoProperty = (userId, propertyId) => {
  const property = findDemoPropertyForOwner(userId, propertyId);
  if (!property || property.status === 'verified') return null;

  property.status = 'verified';
  property.blockchainVerified = true;
  property.verifiedAt = new Date();
  property.verificationRemarks = 'Auto-verified for demo mode';
  return property;
};

export const markDemoPropertyPendingTransfer = (userId, propertyId, newOwnerId, newOwnerName) => {
  const property = findDemoPropertyForOwner(userId, propertyId);
  if (!property || property.status !== 'verified') return null;

  property.status = 'pending_transfer';
  property.pendingTransferTo = newOwnerId;
  property.pendingTransferToName = newOwnerName;
  property.transferRequestedAt = new Date();
  property.transferWillCompleteAt = new Date(Date.now() + 5000);
  return property;
};

export const removeDemoPropertyForUser = (userId, propertyId) => {
  const list = byUser.get(userId) || [];
  const index = list.findIndex(
    (p) => p.propertyId.toLowerCase() === propertyId.trim().toLowerCase()
  );
  if (index === -1) return null;
  const [removed] = list.splice(index, 1);
  byUser.set(userId, list);
  allIds.delete(propertyId);
  return removed;
};

export const addDemoProperty = (userId, property) => {
  if (!property?.propertyId) {
    throw new Error('Demo property must include propertyId');
  }

  const existing = findDemoPropertyById(property.propertyId);
  if (existing) return existing;

  const list = byUser.get(userId) || [];
  const entry = {
    ...property,
    owner: userId,
    _id: `demo-prop-${property.propertyId}`,
    createdAt: new Date(),
    demo: true,
  };
  list.push(entry);
  byUser.set(userId, list);
  allIds.add(property.propertyId);
  return entry;
};

export const getDemoPropertiesForUser = (userId) => byUser.get(userId) || [];

export const seedDemoProperties = (entries) => {
  if (!Array.isArray(entries)) return;
  for (const item of entries) {
    if (item?.userId && item?.property) {
      addDemoProperty(item.userId, item.property);
    }
  }
};
