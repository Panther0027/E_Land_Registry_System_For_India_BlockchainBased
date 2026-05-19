import Property from '../models/Property.js';
import { generatePropertyId } from './crypto.js';
import { getPropertyFromChain } from '../services/blockchainService.js';
import { isDbConnected } from '../config/db.js';
import { isPropertyIdInDemoStore } from '../data/demoPropertyStore.js';

const isOnChain = async (propertyId) => {
  try {
    const onChain = await getPropertyFromChain(propertyId);
    return Boolean(onChain?.propertyId && onChain.area > 0);
  } catch {
    return false;
  }
};

const isTaken = async (propertyId) => {
  if (isPropertyIdInDemoStore(propertyId)) return true;
  if (isDbConnected()) {
    const inDb = await Property.exists({ propertyId });
    if (inDb) return true;
  }
  return isOnChain(propertyId);
};

/** Resolve a unique property ID — auto-generate when blank, reject duplicates early. */
export const resolvePropertyId = async (requestedId) => {
  const custom = requestedId?.trim();

  if (custom) {
    if (await isTaken(custom)) {
      const err = new Error(
        `Property ID "${custom}" is already registered. Leave Property ID empty for a new unique ID.`
      );
      err.statusCode = 400;
      throw err;
    }
    return custom;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const id = generatePropertyId();
    if (!(await isTaken(id))) return id;
  }

  const err = new Error('Could not generate a unique property ID. Please try again.');
  err.statusCode = 500;
  throw err;
};
