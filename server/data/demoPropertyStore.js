/** In-memory properties for demo / offline users (no MongoDB). */
const byUser = new Map();
const allIds = new Set();

export const isPropertyIdInDemoStore = (propertyId) => allIds.has(propertyId);

export const addDemoProperty = (userId, property) => {
  const list = byUser.get(userId) || [];
  const entry = {
    ...property,
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
