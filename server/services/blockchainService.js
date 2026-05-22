import { getContract } from '../config/blockchain.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import Property from '../models/Property.js';

const STATUS_MAP = ['pending', 'verified', 'disputed', 'transferred'];

const normalizeReceipt = (receipt) => {
  const txHash = receipt?.transactionHash || receipt?.hash || '';
  return {
    txHash,
    blockNumber: receipt?.blockNumber,
    gasUsed: receipt?.gasUsed?.toString(),
  };
};

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
  return normalizeReceipt(receipt);
};

export const verifyPropertyOnChain = async (propertyId) => {
  const contract = getContract();
  if (!contract) {
    return { txHash: `0xmockverify${Date.now().toString(16)}`, mock: true };
  }

  const tx = await contract.verifyProperty(propertyId);
  const receipt = await tx.wait();
  return normalizeReceipt(receipt);
};

export const transferOwnershipOnChain = async (propertyId, newOwnerAadhaarHash) => {
  const contract = getContract();
  if (!contract) {
    return { txHash: `0xmocktransfer${Date.now().toString(16)}`, mock: true };
  }

  try {
    const tx = await contract.transferOwnership(propertyId, newOwnerAadhaarHash);
    const receipt = await tx.wait();
    const result = normalizeReceipt(receipt);
    console.log('transferOwnership tx:', result.txHash, 'block', result.blockNumber);
    return result;
  } catch (err) {
    // If estimateGas failed or RPC connection reset, retry with a conservative gasLimit
    const isGasErr = err?.code === 'UNPREDICTABLE_GAS_LIMIT' || (err && err.message && err.message.includes('estimateGas'));
    if (isGasErr) {
      const fallbackLimit = 700000;
      console.warn('estimateGas failed, retrying transfer with gasLimit', fallbackLimit, err.message);
      const tx = await contract.transferOwnership(propertyId, newOwnerAadhaarHash, { gasLimit: fallbackLimit });
      const receipt = await tx.wait();
      const result = normalizeReceipt(receipt);
      console.log('transferOwnership (fallback) tx:', result.txHash, 'block', result.blockNumber);
      return result;
    }
    // rethrow for other errors
    throw err;
  }
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
  try {
    return await Transaction.create(data);
  } catch (err) {
    console.error('Error creating transaction record:', err.message, 'payload:', data, err.stack);
    // Do not crash the server for non-critical logging failures; return null
    return null;
  }
};

export const handleBlockchainEvent = async (eventName, data) => {
  const raw = data?.args?.[0];
  const arg0 = raw == null ? '' : String(raw);
  console.log(`Blockchain event: ${eventName}`, arg0);

  if (eventName === 'PropertyVerified') {
    const propertyId = arg0;
    if (propertyId) {
      await Property.findOneAndUpdate({ propertyId }, { blockchainVerified: true });
    }
  }
};

export const createNotification = async (userId, type, title, message, propertyId = '', metadata = {}) => {
  return Notification.create({ user: userId, type, title, message, propertyId, metadata });
};
