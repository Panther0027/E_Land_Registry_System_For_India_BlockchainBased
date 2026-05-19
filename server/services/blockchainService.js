import { getContract } from '../config/blockchain.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import Property from '../models/Property.js';

const STATUS_MAP = ['pending', 'verified', 'disputed', 'transferred'];

export const registerPropertyOnChain = async (propertyId, ownerAadhaarHash, location, area, ipfsHash) => {
  const contract = getContract();
  if (!contract) {
    return { txHash: `0xmock${Date.now().toString(16)}`, mock: true };
  }

  const tx = await contract.registerProperty(
    propertyId,
    ownerAadhaarHash,
    location,
    Math.floor(area),
    ipfsHash
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() };
};

export const verifyPropertyOnChain = async (propertyId) => {
  const contract = getContract();
  if (!contract) {
    return { txHash: `0xmockverify${Date.now().toString(16)}`, mock: true };
  }

  const tx = await contract.verifyProperty(propertyId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const transferOwnershipOnChain = async (propertyId, newOwnerAadhaarHash) => {
  const contract = getContract();
  if (!contract) {
    return { txHash: `0xmocktransfer${Date.now().toString(16)}`, mock: true };
  }

  const tx = await contract.transferOwnership(propertyId, newOwnerAadhaarHash);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const getPropertyFromChain = async (propertyId) => {
  const contract = getContract();
  if (!contract) return null;

  try {
    const result = await contract.getProperty(propertyId);
    if (!result[0]) return null;
    return {
      propertyId: result[0],
      ownerAadhaar: result[1],
      location: result[2],
      area: Number(result[3]),
      ipfsHash: result[4],
      status: STATUS_MAP[Number(result[5])] || 'pending',
      registeredAt: Number(result[6]),
    };
  } catch {
    return null;
  }
};

export const getOwnershipHistoryFromChain = async (propertyId) => {
  const contract = getContract();
  if (!contract) return [];

  try {
    const history = await contract.getOwnershipHistory(propertyId);
    return history.map((record) => ({
      ownerAadhaar: record.ownerAadhaar,
      timestamp: Number(record.timestamp),
      actionType: record.actionType,
    }));
  } catch {
    return [];
  }
};

export const raiseDisputeOnChain = async (propertyId, reason) => {
  const contract = getContract();
  if (!contract) {
    return { txHash: `0xmockdispute${Date.now().toString(16)}`, mock: true };
  }

  const tx = await contract.raiseDispute(propertyId, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const createTransactionRecord = async (data) => {
  return Transaction.create(data);
};

export const handleBlockchainEvent = async (eventName, data) => {
  console.log(`Blockchain event: ${eventName}`, data?.args?.[0] || '');

  if (eventName === 'PropertyVerified') {
    const propertyId = data.args[0];
    await Property.findOneAndUpdate(
      { propertyId },
      { blockchainVerified: true }
    );
  }
};

export const createNotification = async (userId, type, title, message, propertyId = '', metadata = {}) => {
  return Notification.create({ user: userId, type, title, message, propertyId, metadata });
};
