import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LAND_REGISTRY_ABI = [
  'event PropertyRegistered(string indexed propertyId, string ownerAadhaar, string location, uint256 area, string ipfsHash, uint256 timestamp)',
  'event PropertyVerified(string indexed propertyId, address indexed verifiedBy, uint256 timestamp)',
  'event OwnershipTransferred(string indexed propertyId, string previousOwner, string newOwner, uint256 timestamp)',
  'event PropertyDisputed(string indexed propertyId, string reason, uint256 timestamp)',
  'function registerProperty(string propertyId, string ownerAadhaar, string location, uint256 area, string ipfsHash)',
  'function verifyProperty(string propertyId)',
  'function transferOwnership(string propertyId, string newOwnerAadhaar)',
  'function raiseDispute(string propertyId, string reason)',
  'function getProperty(string propertyId) view returns (string, string, string, uint256, string, uint8, uint256)',
  'function getOwnershipHistory(string propertyId) view returns (tuple(string ownerAadhaar, uint256 timestamp, string actionType)[])',
  'function addGovernmentOfficial(address official)',
  'function isGovernmentOfficial(address account) view returns (bool)',
];

let provider = null;
let wallet = null;
let contract = null;

export const initBlockchain = () => {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.warn('Blockchain not fully configured. Set SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS');
    return null;
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  wallet = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractAddress, LAND_REGISTRY_ABI, wallet);

  console.log('Blockchain connected. Wallet:', wallet.address);
  return contract;
};

export const getContract = () => contract;
export const getProvider = () => provider;
export const getWallet = () => wallet;
export { LAND_REGISTRY_ABI };

export const setupEventListeners = (onEvent) => {
  if (!contract) return;

  contract.on('PropertyRegistered', (...args) => {
    const event = args[args.length - 1];
    onEvent('PropertyRegistered', { args: args.slice(0, -1), event });
  });

  contract.on('PropertyVerified', (...args) => {
    const event = args[args.length - 1];
    onEvent('PropertyVerified', { args: args.slice(0, -1), event });
  });

  contract.on('OwnershipTransferred', (...args) => {
    const event = args[args.length - 1];
    onEvent('OwnershipTransferred', { args: args.slice(0, -1), event });
  });

  contract.on('PropertyDisputed', (...args) => {
    const event = args[args.length - 1];
    onEvent('PropertyDisputed', { args: args.slice(0, -1), event });
  });

  console.log('Blockchain event listeners active');
};
