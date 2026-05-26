import Property from '../models/Property.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { generateOTP, hashAadhaar, validateAadhaar } from '../utils/crypto.js';
import { getIO } from '../config/socket.js';
import { resolvePropertyId } from '../utils/propertyId.js';
import { uploadToIPFS, uploadJSONToIPFS, getIPFSUrl } from '../config/pinata.js';
import {
  registerPropertyOnChain,
  verifyPropertyOnChain,
  transferOwnershipOnChain,
  raiseDisputeOnChain,
  getPropertyFromChain,
  getOwnershipHistoryFromChain,
  createTransactionRecord,
  createNotification,
} from '../services/blockchainService.js';
import { generateLandCertificate } from '../services/certificateService.js';
import { findDemoProperty, DEMO_PUBLIC_STATS, getDemoBlockchainVerification } from '../data/demoProperties.js';
import {
  isDemoUser,
  getDemoDocumentsForUser,
  addDemoDocumentUpload,
} from '../data/demoDocuments.js';
import {
  addDemoProperty,
  getDemoPropertiesForUser,
  findDemoPropertyForOwner,
  markDemoPropertyPendingTransfer,
  removeDemoPropertyForUser,
  verifyDemoProperty,
} from '../data/demoPropertyStore.js';
import { addDemoTransaction, getDemoTransactionsForProperty, getRecentDemoTransactions } from '../data/demoTransactions.js';
import { getDemoUserByAadhaarHash } from '../services/demoAuthStore.js';
import { getContract } from '../config/blockchain.js';
import { isDbConnected } from '../config/db.js';
import { isDemoModeEnabled, isOfflineMode } from '../config/appConfig.js';
import { buildTransferOtpKey, getTransferOtp, removeTransferOtp, setTransferOtp } from '../data/otpStore.js';
import { maskEmail, maskPhone, sendTransferOtp } from '../services/otpService.js';
import fs from 'fs';

const registerOnChainWithRetry = async (resolveId, ownerAadhaarHash, location, area, ipfsHash) => {
  let propertyId = await resolveId();
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return {
        propertyId,
        ...(await registerPropertyOnChain(propertyId, ownerAadhaarHash, location, area, ipfsHash)),
      };
    } catch (error) {
      const msg = `${error.reason || ''} ${error.message || ''}`;
      if (msg.includes('already exists')) {
        propertyId = await resolveId();
        continue;
      }
      if (process.env.NODE_ENV !== 'production' || isOfflineMode()) {
        return {
          propertyId,
          txHash: `0xlocal${Date.now().toString(16)}`,
          mock: true,
        };
      }
      throw error;
    }
  }

  const err = new Error('Could not register on blockchain after several attempts. Leave Property ID empty and try again.');
  err.statusCode = 400;
  throw err;
};

const safeUploadToIPFS = async (filePath, fileName) => {
  try {
    return await uploadToIPFS(filePath, fileName);
  } catch (error) {
    console.warn('IPFS upload failed, using local mock hash:', error.message);
    return `QmLocal${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  }
};

export const registerProperty = async (req, res, next) => {
  try {
    const {
      surveyNumber,
      district,
      state,
      pincode,
      area,
      landType,
      ownerName,
      ownerAadhaar,
      hasCoOwner,
      coOwnerName,
      coOwnerAadhaar,
    } = req.body;

    const userId = req.user._id ?? req.user.id;
    const saveInMemory = !isDbConnected() || isDemoUser(req.user);

    if (!surveyNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Survey number is required' });
    }
    if (!ownerAadhaar?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner Aadhaar is required' });
    }
    if (!ownerName?.trim()) {
      return res.status(400).json({ success: false, message: 'Owner name is required' });
    }

    const cleanAadhaar = ownerAadhaar.replace(/\D/g, '');
    const ownerAadhaarHash = hashAadhaar(cleanAadhaar);
    let customPropertyId = req.body.propertyId?.trim() || '';
    const resolveNextId = async () => {
      const id = await resolvePropertyId(customPropertyId || undefined);
      customPropertyId = '';
      return id;
    };

    const documents = [];
    let combinedIpfsHash = '';

    if (req.files?.landDeed?.[0]) {
      const file = req.files.landDeed[0];
      const hash = await safeUploadToIPFS(file.path, file.originalname);
      documents.push({ name: file.originalname, type: 'deed', ipfsHash: hash });
      fs.unlinkSync(file.path);
    }

    if (req.files?.ownershipProof?.[0]) {
      const file = req.files.ownershipProof[0];
      const hash = await safeUploadToIPFS(file.path, file.originalname);
      documents.push({ name: file.originalname, type: 'ownership_proof', ipfsHash: hash });
      fs.unlinkSync(file.path);
    }

    const location = `${district}, ${state} - ${pincode}`;
    const chainResult = await registerOnChainWithRetry(
      resolveNextId,
      ownerAadhaarHash,
      location,
      parseFloat(area),
      combinedIpfsHash
    );
    const propertyId = chainResult.propertyId;

    if (documents.length > 0) {
      try {
        combinedIpfsHash = await uploadJSONToIPFS({
          propertyId,
          documents: documents.map((d) => ({ name: d.name, type: d.type, hash: d.ipfsHash })),
        });
      } catch (error) {
        console.warn('IPFS metadata upload failed:', error.message);
        combinedIpfsHash = documents[0]?.ipfsHash || '';
      }
    }

    const coOwners = [];
    if (hasCoOwner === 'true' && coOwnerName && coOwnerAadhaar) {
      coOwners.push({
        name: coOwnerName,
        aadhaarHash: hashAadhaar(coOwnerAadhaar),
        aadhaarLast4: coOwnerAadhaar.replace(/\s/g, '').slice(-4),
      });
    }

    if (saveInMemory) {
      const property = addDemoProperty(userId, {
        propertyId,
        surveyNumber,
        ownerName,
        district,
        state,
        pincode,
        area: parseFloat(area),
        landType,
        status: 'pending',
        ipfsHash: combinedIpfsHash,
        documents,
        transactionHash: chainResult.txHash,
        coOwners,
        blockchainVerified: !chainResult.mock,
      });

      setTimeout(() => {
        const verified = verifyDemoProperty(userId, property.propertyId);
        if (verified) {
          console.log(`Demo property ${property.propertyId} auto-verified after 20 seconds`);
          addDemoTransaction({
            propertyId: property.propertyId,
            actionType: 'VERIFY',
            txHash: property.transactionHash,
            initiatedBy: userId,
            status: 'confirmed',
            createdAt: new Date(),
          });
        }
      }, 20000);

      // Create a demo transaction record for registration so dashboard shows activity
      addDemoTransaction({
        propertyId: property.propertyId,
        actionType: 'REGISTER',
        txHash: property.transactionHash,
        initiatedBy: userId,
        status: 'confirmed',
        createdAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        message: isOfflineMode()
          ? 'Property registered (offline mode — connect MongoDB for permanent storage)'
          : 'Property registered successfully',
        data: {
          property,
          transactionHash: chainResult.txHash,
          ipfsUrl: combinedIpfsHash ? getIPFSUrl(combinedIpfsHash) : null,
          demo: isOfflineMode() || isDemoUser(req.user),
        },
      });
    }

    const property = await Property.create({
      propertyId,
      surveyNumber,
      owner: req.user._id,
      ownerAadhaarHash,
      ownerName,
      coOwners,
      district,
      state,
      pincode,
      area: parseFloat(area),
      landType,
      status: 'pending',
      ipfsHash: combinedIpfsHash,
      documents,
      transactionHash: chainResult.txHash,
    });

    try {
      await createTransactionRecord({
        propertyId,
        property: property._id,
        txHash: chainResult.txHash,
        actionType: 'REGISTER',
        initiatedBy: req.user._id,
        blockNumber: chainResult.blockNumber,
        gasUsed: chainResult.gasUsed,
      });

      const officials = await User.find({ role: 'government_official' });
      for (const official of officials) {
        await createNotification(
          official._id,
          'property_registered',
          'New Property Registration',
          `Property ${propertyId} registered in ${district}, ${state} and awaiting verification.`,
          propertyId
        );
      }
    } catch (dbErr) {
      console.warn('Post-register DB writes skipped:', dbErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Property registered successfully',
      data: {
        property,
        transactionHash: chainResult.txHash,
        ipfsUrl: combinedIpfsHash ? getIPFSUrl(combinedIpfsHash) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProperty = async (req, res, next) => {
  try {
    let property = null;
    if (isDbConnected()) {
      property = await Property.findOne({ propertyId: req.params.id })
        .populate('owner', 'fullName email walletAddress')
        .populate('verifiedBy', 'fullName');
    }

    if (!property) {
      if (isDemoModeEnabled() || !isDbConnected()) {
        const demoProperty = findDemoProperty({ propertyId: req.params.id });
        if (demoProperty) {
          const chainData = getDemoBlockchainVerification(demoProperty.propertyId);
          const transactions = getDemoTransactionsForProperty(demoProperty.propertyId);
          return res.json({
            success: true,
            data: {
              property: demoProperty,
              transactions,
              ownershipHistory: chainData?.history || [],
              ipfsUrl: demoProperty.ipfsHash ? getIPFSUrl(demoProperty.ipfsHash) : null,
            },
            demo: true,
          });
        }
      }
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const transactions = await Transaction.find({ propertyId: property.propertyId })
      .populate('initiatedBy', 'fullName role')
      .sort({ createdAt: -1 });

    const chainHistory = await getOwnershipHistoryFromChain(property.propertyId);

    res.json({
      success: true,
      data: {
        property,
        transactions,
        ownershipHistory: chainHistory,
        ipfsUrl: property.ipfsHash ? getIPFSUrl(property.ipfsHash) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertiesByOwner = async (req, res, next) => {
  try {
    if (isDemoUser(req.user) || !isDbConnected()) {
      const userId = req.user._id ?? req.user.id;
      let properties = getDemoPropertiesForUser(userId);
      const { status, search } = req.query;
      if (status && status !== 'all') {
        properties = properties.filter((p) => p.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        properties = properties.filter(
          (p) =>
            p.propertyId.toLowerCase().includes(q) ||
            p.surveyNumber.toLowerCase().includes(q) ||
            p.district.toLowerCase().includes(q)
        );
      }
      return res.json({ success: true, data: properties, count: properties.length, demo: true });
    }

    const { status, search, sort = 'newest' } = req.query;
    const query = {}; // show all properties to every registered user

    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { propertyId: { $regex: search, $options: 'i' } },
        { surveyNumber: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const properties = await Property.find(query).sort(sortOption);

    res.json({ success: true, data: properties, count: properties.length });
  } catch (error) {
    if (isDemoModeEnabled() && isDemoUser(req.user)) {
      const userId = req.user._id ?? req.user.id;
      const properties = getDemoPropertiesForUser(userId);
      return res.json({ success: true, data: properties, count: properties.length, demo: true });
    }
    next(error);
  }
};

export const getPropertiesByAadhaar = async (req, res, next) => {
  try {
    const aadhaarHash = hashAadhaar(req.params.aadhaar);
    const properties = await Property.find({ ownerAadhaarHash: aadhaarHash });
    res.json({ success: true, data: properties });
  } catch (error) {
    next(error);
  }
};

export const searchProperty = async (req, res, next) => {
  try {
    const { propertyId, surveyNumber } = req.query;
    const query = {};

    if (propertyId) query.propertyId = propertyId;
    else if (surveyNumber) query.surveyNumber = surveyNumber;
    else {
      return res.status(400).json({
        success: false,
        message: 'Provide propertyId or surveyNumber',
      });
    }

    let property = null;
    let demo = false;

    if (isDbConnected()) {
      try {
        property = await Property.findOne(query).populate('owner', 'fullName email');
      } catch (dbErr) {
        console.warn('Property search DB error, trying demo data:', dbErr.message);
      }
    }

    if (!property && isDemoModeEnabled()) {
      const demoProperty = findDemoProperty({ propertyId, surveyNumber });
      if (demoProperty) {
        property = demoProperty;
        demo = true;
      }
    }

    if (!property) {
      return res.json({
        success: true,
        data: null,
        verified: false,
        message: 'Property not found',
        demo: !isDbConnected() || isDemoModeEnabled(),
      });
    }

    let chainData = null;
    try {
      chainData = await getPropertyFromChain(property.propertyId);
    } catch {
      /* blockchain optional for demo */
    }

    res.json({
      success: true,
      data: property,
      verified: property.status === 'verified',
      blockchainData: chainData,
      demo,
    });
  } catch (error) {
    next(error);
  }
};

const validateTransferOtpRequest = ({ propertyId, newOwnerAadhaar, channel }) => {
  if (!propertyId || !String(propertyId).trim()) {
    const error = new Error('Property ID is required for OTP request');
    error.statusCode = 400;
    throw error;
  }

  const aadhaar = String(newOwnerAadhaar || '').replace(/\D/g, '');
  if (!validateAadhaar(aadhaar)) {
    const error = new Error('Enter a valid 12-digit Aadhaar for recipient lookup');
    error.statusCode = 400;
    throw error;
  }

  if (channel && !['email', 'sms'].includes(channel)) {
    const error = new Error('OTP channel must be email or sms');
    error.statusCode = 400;
    throw error;
  }

  return aadhaar;
};

export const requestTransferOtp = async (req, res, next) => {
  try {
    const { propertyId, newOwnerAadhaar, channel } = req.body;
    const aadhaar = validateTransferOtpRequest({ propertyId, newOwnerAadhaar, channel });
    const newOwnerHash = hashAadhaar(aadhaar);

    const userId = req.user._id ?? req.user.id;
    const isDemoTransfer = isDemoUser(req.user) || !isDbConnected();

    let property;
    if (isDemoTransfer) {
      property = findDemoPropertyForOwner(userId, propertyId);
    } else {
      property = await Property.findOne({ propertyId, owner: req.user._id });
    }

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found or not owned by you' });
    }

    if (property.status !== 'verified') {
      return res.status(400).json({ success: false, message: 'Only verified properties can be transferred' });
    }

    let newOwner;
    if (isDemoTransfer) {
      newOwner = getDemoUserByAadhaarHash(newOwnerHash);
    } else {
      newOwner = await User.findOne({ aadhaarHash: newOwnerHash }).select('fullName email phone walletAddress');
    }

    if (!newOwner) {
      return res.status(404).json({ success: false, message: 'New owner not found. They must register on Bhumi first.' });
    }

    const preferredChannel = channel || (newOwner.email ? 'email' : 'sms');
    if (preferredChannel === 'email' && !newOwner.email) {
      return res.status(400).json({ success: false, message: 'Recipient has no email address on file' });
    }
    if (preferredChannel === 'sms' && !newOwner.phone) {
      return res.status(400).json({ success: false, message: 'Recipient has no phone number on file' });
    }

    const otp = generateOTP();
    const key = buildTransferOtpKey(userId, propertyId, aadhaar);
    setTransferOtp(key, {
      otp,
      expiresAt: Date.now() + 1000 * 60 * 10,
      channel: preferredChannel,
      propertyId,
      newOwnerAadhaar: aadhaar,
    });

    const contactValue = preferredChannel === 'email' ? newOwner.email : newOwner.phone;
    await sendTransferOtp({ channel: preferredChannel, to: contactValue, otp });

    res.json({
      success: true,
      message: `OTP sent to ${preferredChannel === 'email' ? maskEmail(newOwner.email) : maskPhone(newOwner.phone)}. Use it to confirm the transfer.`,
      data: { contactMethod: preferredChannel },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const transferOwnership = async (req, res, next) => {
  try {
    const { propertyId, newOwnerAadhaar, transferReason, otp } = req.body;
    const cleanAadhaar = String(newOwnerAadhaar || '').replace(/\D/g, '');
    if (!validateAadhaar(cleanAadhaar)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 12-digit Aadhaar for the recipient' });
    }

    const newOwnerHash = hashAadhaar(cleanAadhaar);
    const userId = req.user._id ?? req.user.id;
    const otpKey = buildTransferOtpKey(userId, propertyId, cleanAadhaar);
    const otpEntry = getTransferOtp(otpKey);

    if (!otpEntry) {
      return res.status(400).json({ success: false, message: 'Please request an OTP before confirming transfer' });
    }

    if (otpEntry.expiresAt <= Date.now()) {
      removeTransferOtp(otpKey);
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    }

    if (!otp || String(otp).trim() !== otpEntry.otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    removeTransferOtp(otpKey);

    const isDemoTransfer = isDemoUser(req.user) || !isDbConnected();

    if (isDemoTransfer) {
      const userId = req.user._id ?? req.user.id;
      const property = findDemoPropertyForOwner(userId, propertyId);

      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found or not owned by you' });
      }

      if (property.status !== 'verified') {
        return res.status(400).json({
          success: false,
          message: 'Only verified properties can be transferred',
        });
      }

      const newOwner = getDemoUserByAadhaarHash(newOwnerHash);
      if (!newOwner) {
        return res.status(404).json({
          success: false,
          message: 'New owner not found. They must register on Bhumi first.',
        });
      }

      const pendingProperty = markDemoPropertyPendingTransfer(userId, propertyId, newOwner.id ?? newOwner._id, newOwner.fullName);
      if (!pendingProperty) {
        return res.status(400).json({
          success: false,
          message: 'Unable to schedule transfer. Property must be verified and owned by you.',
        });
      }

      addDemoTransaction({
        propertyId,
        actionType: 'TRANSFER_REQUEST',
        txHash: pendingProperty.transactionHash,
        initiatedBy: userId,
        status: 'pending',
        details: { previousOwner: req.user.fullName, newOwner: newOwner.fullName },
        createdAt: new Date(),
      });

      await createNotification(
        newOwner.id ?? newOwner._id,
        'transfer_request',
        'Incoming Ownership Transfer',
        `${req.user.fullName} has initiated a transfer for property ${propertyId}.`,
        propertyId
      );

      await createNotification(
        userId,
        'transfer_request',
        'Transfer Initiated',
        `You requested transfer of property ${propertyId} to ${newOwner.fullName}.`,
        propertyId
      );

      const io = getIO();

      setTimeout(async () => {
        const ownerProperty = findDemoPropertyForOwner(userId, propertyId);
        if (!ownerProperty || ownerProperty.status !== 'pending_transfer') {
          return;
        }

        const removed = removeDemoPropertyForUser(userId, propertyId);
        if (!removed) {
          return;
        }

        const transferredProperty = addDemoProperty(newOwner.id ?? newOwner._id, {
          ...removed,
          ownerName: newOwner.fullName,
          ownerAadhaarHash: newOwnerHash,
          owner: newOwner.id ?? newOwner._id,
          status: 'transferred',
          transactionHash: `0xlocal${Date.now().toString(16)}`,
        });

        addDemoTransaction({
          propertyId,
          actionType: 'TRANSFER',
          txHash: transferredProperty.transactionHash,
          initiatedBy: newOwner.id ?? newOwner._id,
          status: 'confirmed',
          details: { previousOwner: req.user.fullName, newOwner: newOwner.fullName },
          createdAt: new Date(),
        });

        if (io) {
          io.to(`user:${newOwner.id ?? newOwner._id}`).emit('property_transferred', { propertyId, newOwner: newOwner.fullName });
          io.to(`user:${userId}`).emit('property_transfer_confirmed', { propertyId });
        }
      }, 5000);

      return res.json({
        success: true,
        message: 'Ownership transfer initiated. It will complete in a few seconds.',
        data: {
          property: pendingProperty,
          newOwner: { fullName: newOwner.fullName, walletAddress: newOwner.walletAddress },
        },
        demo: true,
      });
    }

    const property = await Property.findOne({ propertyId, owner: req.user._id });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found or not owned by you' });
    }

    if (property.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Only verified properties can be transferred',
      });
    }

    const newOwner = await User.findOne({ aadhaarHash: newOwnerHash });
    if (!newOwner) {
      return res.status(404).json({
        success: false,
        message: 'New owner not found. They must register on Bhumi first.',
      });
    }

    const chainResult = await transferOwnershipOnChain(propertyId, newOwnerHash);

    property.owner = newOwner._id;
    property.ownerAadhaarHash = newOwnerHash;
    property.ownerName = newOwner.fullName;
    property.status = 'transferred';
    property.transactionHash = chainResult.txHash;
    await property.save();

    await createTransactionRecord({
      propertyId,
      property: property._id,
      txHash: chainResult.txHash,
      actionType: 'TRANSFER',
      initiatedBy: req.user._id,
      details: { transferReason, previousOwner: req.user.fullName },
      blockNumber: chainResult.blockNumber,
    });

    await createNotification(
      newOwner._id,
      'transfer_completed',
      'Ownership Transferred',
      `You are now the owner of property ${propertyId}.`,
      propertyId
    );

    await createNotification(
      req.user._id,
      'transfer_completed',
      'Transfer Completed',
      `You transferred ${propertyId} to ${newOwner.fullName}.`,
      propertyId
    );

    const io = getIO();
    if (io) {
      io.to(`user:${newOwner._id}`).emit('property_transferred', { propertyId, newOwner: newOwner.fullName });
      io.to(`user:${req.user._id}`).emit('property_transfer_confirmed', { propertyId });
    }

    res.json({
      success: true,
      message: 'Ownership transferred successfully',
      data: {
        property,
        transactionHash: chainResult.txHash,
        newOwner: { fullName: newOwner.fullName, walletAddress: newOwner.walletAddress },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyProperty = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const property = await Property.findOne({ propertyId: req.params.id });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Property is not pending verification',
      });
    }

    const chainResult = await verifyPropertyOnChain(property.propertyId);

    property.status = 'verified';
    property.verificationRemarks = remarks || '';
    property.verifiedBy = req.user._id;
    property.verifiedAt = new Date();
    property.blockchainVerified = true;
    property.transactionHash = chainResult.txHash;
    await property.save();

    await createTransactionRecord({
      propertyId: property.propertyId,
      property: property._id,
      txHash: chainResult.txHash,
      actionType: 'VERIFY',
      initiatedBy: req.user._id,
      blockNumber: chainResult.blockNumber,
    });

    await createNotification(
      property.owner,
      'verification_completed',
      'Property Verified',
      `Your property ${property.propertyId} has been verified by the government.`,
      property.propertyId
    );

    res.json({
      success: true,
      message: 'Property verified successfully',
      data: { property, transactionHash: chainResult.txHash },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectProperty = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const property = await Property.findOne({ propertyId: req.params.id });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    property.status = 'disputed';
    property.verificationRemarks = remarks || 'Rejected by government official';
    await property.save();

    await createNotification(
      property.owner,
      'property_rejected',
      'Property Registration Rejected',
      `Your property ${property.propertyId} registration was rejected. Remarks: ${remarks}`,
      property.propertyId
    );

    res.json({ success: true, message: 'Property rejected', data: property });
  } catch (error) {
    next(error);
  }
};

export const getPendingProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ status: 'pending' })
      .populate('owner', 'fullName email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: properties, count: properties.length });
  } catch (error) {
    next(error);
  }
};

export const raiseDispute = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a detailed reason (min 10 characters)' });
    }

    const property = await Property.findOne({ propertyId: req.params.id });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.status === 'disputed') {
      return res.status(400).json({ success: false, message: 'Property is already under dispute' });
    }

    const chainResult = await raiseDisputeOnChain(property.propertyId, reason);

    property.status = 'disputed';
    property.verificationRemarks = reason;
    property.transactionHash = chainResult.txHash;
    await property.save();

    await createTransactionRecord({
      propertyId: property.propertyId,
      property: property._id,
      txHash: chainResult.txHash,
      actionType: 'DISPUTE',
      initiatedBy: req.user._id,
      details: { reason },
      blockNumber: chainResult.blockNumber,
    });

    const officials = await User.find({ role: { $in: ['government_official', 'verifier'] } });
    for (const official of officials) {
      await createNotification(
        official._id,
        'dispute_raised',
        'Property Dispute Raised',
        `Dispute raised on property ${property.propertyId}: ${reason}`,
        property.propertyId
      );
    }

    res.json({ success: true, message: 'Dispute raised successfully', data: property, transactionHash: chainResult.txHash });
  } catch (error) {
    next(error);
  }
};

export const getDisputedProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ status: 'disputed' })
      .populate('owner', 'fullName email phone')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: properties, count: properties.length });
  } catch (error) {
    next(error);
  }
};

export const resolveDispute = async (req, res, next) => {
  try {
    const { resolution, newStatus } = req.body;
    const property = await Property.findOne({ propertyId: req.params.id });

    if (!property || property.status !== 'disputed') {
      return res.status(404).json({ success: false, message: 'Disputed property not found' });
    }

    property.status = newStatus || 'verified';
    property.verificationRemarks = resolution || 'Dispute resolved';
    property.verifiedBy = req.user._id;
    property.verifiedAt = new Date();
    await property.save();

    await createNotification(
      property.owner,
      'verification_completed',
      'Dispute Resolved',
      `Dispute on property ${property.propertyId} has been resolved. Status: ${property.status}`,
      property.propertyId
    );

    res.json({ success: true, message: 'Dispute resolved', data: property });
  } catch (error) {
    next(error);
  }
};

export const getGovernmentStats = async (req, res, next) => {
  try {
    const [
      totalProperties,
      pendingCount,
      verifiedCount,
      disputedCount,
      transferredCount,
      recentRegistrations,
      byState,
      byLandType,
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: 'pending' }),
      Property.countDocuments({ status: 'verified' }),
      Property.countDocuments({ status: 'disputed' }),
      Property.countDocuments({ status: 'transferred' }),
      Property.find().sort({ createdAt: -1 }).limit(5).populate('owner', 'fullName'),
      Property.aggregate([
        { $group: { _id: '$state', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Property.aggregate([
        { $group: { _id: '$landType', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalProperties,
        pendingCount,
        verifiedCount,
        disputedCount,
        transferredCount,
        recentRegistrations,
        byState,
        byLandType,
        verificationRate: totalProperties > 0 ? Math.round((verifiedCount / totalProperties) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicStats = async (req, res, next) => {
  try {
    const [totalProperties, verifiedCount, totalTransactions] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: 'verified' }),
      Transaction.countDocuments(),
    ]);

    const statesCovered = await Property.distinct('state').then((s) => s.length);

    res.json({
      success: true,
      data: totalProperties > 0
        ? { totalProperties, verifiedCount, totalTransactions, statesCovered }
        : DEMO_PUBLIC_STATS,
    });
  } catch {
    res.json({ success: true, data: DEMO_PUBLIC_STATS });
  }
};

export const generateCertificate = async (req, res, next) => {
  try {
    const property = await Property.findOne({ propertyId: req.params.id })
      .populate('verifiedBy', 'fullName');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.status !== 'verified' && property.status !== 'transferred') {
      return res.status(400).json({ success: false, message: 'Certificate only available for verified properties' });
    }

    const isOwner = property.owner.toString() === req.user._id.toString();
    const isOfficial = ['government_official', 'verifier'].includes(req.user.role);
    if (!isOwner && !isOfficial) {
      return res.status(403).json({ success: false, message: 'Not authorized to download certificate' });
    }

    const pdfBuffer = await generateLandCertificate(property, property.verifiedBy);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Bhumi-Certificate-${property.propertyId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id ?? req.user.id;
    const role = req.user.role;

    if (isDemoUser(req.user) || !isDbConnected()) {
      const props = getDemoPropertiesForUser(userId);
      const ownerPayload = {
        role: 'owner',
        totalProperties: props.length,
        pendingCount: props.filter((p) => p.status === 'pending').length,
        verifiedCount: props.filter((p) => p.status === 'verified').length,
        disputedCount: props.filter((p) => p.status === 'disputed').length,
        transferredCount: props.filter((p) => p.status === 'transferred').length,
        recentActivity: [],
        demo: true,
      };
      if (role === 'government_official' || role === 'verifier') {
        return res.json({
          success: true,
          data: {
            role,
            pendingCount: DEMO_PUBLIC_STATS.totalProperties,
            verifiedCount: DEMO_PUBLIC_STATS.verifiedCount,
            disputedCount: 0,
            transferredCount: 0,
            recentActivity: [],
            demo: true,
          },
        });
      }
      ownerPayload.recentActivity = getRecentDemoTransactions(10);
      return res.json({ success: true, data: ownerPayload });
    }

    if (role === 'government_official' || role === 'verifier') {
      const [pendingCount, verifiedCount, disputedCount, recentTransactions] = await Promise.all([
        Property.countDocuments({ status: 'pending' }),
        Property.countDocuments({ status: 'verified' }),
        Property.countDocuments({ status: 'disputed' }),
        Transaction.find().sort({ createdAt: -1 }).limit(10).populate('initiatedBy', 'fullName role'),
      ]);

      return res.json({
        success: true,
        data: {
          role,
          pendingCount,
          verifiedCount,
          disputedCount,
          recentActivity: recentTransactions,
        },
      });
    }

    const [totalProperties, pendingCount, verifiedCount, disputedCount, transferredCount, recentTransactions] = await Promise.all([
      Property.countDocuments({ owner: userId }),
      Property.countDocuments({ owner: userId, status: 'pending' }),
      Property.countDocuments({ owner: userId, status: 'verified' }),
      Property.countDocuments({ owner: userId, status: 'disputed' }),
      Property.countDocuments({ owner: userId, status: 'transferred' }),
      Transaction.find({ initiatedBy: userId }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        role: 'owner',
        totalProperties,
        pendingCount,
        verifiedCount,
        disputedCount,
        transferredCount,
        recentActivity: recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req, res, next) => {
  try {
    const { propertyId, documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!propertyId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const ipfsHash = await uploadToIPFS(req.file.path, req.file.originalname);
    fs.unlinkSync(req.file.path);

    if (isDemoUser(req.user) || !isDbConnected()) {
      const demoProp = findDemoProperty({ propertyId });
      if (!demoProp) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }
      const userId = req.user.id || req.user._id;
      const document = addDemoDocumentUpload(userId, {
        name: req.file.originalname,
        type: documentType || 'other',
        ipfsHash,
        propertyId,
        location: `${demoProp.district}, ${demoProp.state}`,
      });
      return res.json({
        success: true,
        message: 'Document uploaded (demo mode)',
        data: { document, ipfsUrl: document.ipfsUrl },
      });
    }

    const property = await Property.findOne({ propertyId, owner: req.user._id });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    property.documents.push({
      name: req.file.originalname,
      type: documentType || 'other',
      ipfsHash,
    });
    await property.save();

    res.json({
      success: true,
      message: 'Document uploaded',
      data: {
        document: property.documents[property.documents.length - 1],
        ipfsUrl: getIPFSUrl(ipfsHash),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (isDemoUser(req.user) || !isDbConnected()) {
      return res.json({
        success: true,
        data: getDemoDocumentsForUser(userId),
        demo: true,
      });
    }

    const properties = await Property.find({}).select(
      'propertyId district state documents ipfsHash'
    );

    const documents = properties.flatMap((p) =>
      (p.documents || []).map((d) => ({
        ...d.toObject(),
        propertyId: p.propertyId,
        location: `${p.district}, ${p.state}`,
        ipfsUrl: getIPFSUrl(d.ipfsHash),
      }))
    );

    res.json({ success: true, data: documents });
  } catch (error) {
    if (isDemoModeEnabled() && isDemoUser(req.user)) {
      return res.json({
        success: true,
        data: getDemoDocumentsForUser(req.user.id || req.user._id),
        demo: true,
      });
    }
    next(error);
  }
};

export const verifyOnBlockchain = async (req, res, next) => {
  try {
    const propertyId = req.params.id?.trim();
    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const contract = getContract();
    const contractAddress = contract?.address ?? process.env.CONTRACT_ADDRESS ?? null;

    let chainData = null;
    let history = [];

    try {
      chainData = await getPropertyFromChain(propertyId);
      if (chainData) {
        history = await getOwnershipHistoryFromChain(propertyId);
      }
    } catch (chainErr) {
      console.warn('Blockchain read failed:', chainErr.message);
    }

    if (chainData) {
      return res.json({
        success: true,
        verified: true,
        onChain: true,
        data: chainData,
        history,
        contractAddress,
        network: 'sepolia',
      });
    }

    if (isDemoModeEnabled()) {
      const demoVerification = getDemoBlockchainVerification(propertyId, contractAddress);
      if (demoVerification) {
        return res.json({
          success: true,
          ...demoVerification,
        });
      }
    }

    res.json({
      success: true,
      verified: false,
      message: 'Property not found on blockchain',
    });
  } catch (error) {
    next(error);
  }
};

export const listPropertyForSale = async (req, res, next) => {
  try {
    const { propertyId, listingPrice, listingDescription } = req.body;
    const userId = req.user._id ?? req.user.id;

    if (!propertyId || !listingPrice) {
      return res.status(400).json({ success: false, message: 'Property ID and listing price are required' });
    }

    if (typeof listingPrice !== 'number' || listingPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Listing price must be a positive number' });
    }

    const isDemoList = isDemoUser(req.user) || !isDbConnected();

    if (isDemoList) {
      const property = findDemoPropertyForOwner(userId, propertyId);
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found or not owned by you' });
      }
      if (property.status !== 'verified') {
        return res.status(400).json({ success: false, message: 'Only verified properties can be listed for sale' });
      }

      property.forSale = true;
      property.listingPrice = listingPrice;
      property.listingDescription = listingDescription || '';
      property.listedAt = new Date();

      return res.json({
        success: true,
        message: 'Property listed for sale',
        data: property,
        demo: true,
      });
    }

    const property = await Property.findOne({ propertyId, owner: userId });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found or not owned by you' });
    }

    if (property.status !== 'verified') {
      return res.status(400).json({ success: false, message: 'Only verified properties can be listed for sale' });
    }

    property.forSale = true;
    property.listingPrice = listingPrice;
    property.listingDescription = listingDescription || '';
    property.listedAt = new Date();
    await property.save();

    res.json({
      success: true,
      message: 'Property listed for sale',
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertiesForSale = async (req, res, next) => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '12', 10), 100);
    const skip = (page - 1) * limit;

    let properties = [];

    if (isDemoUser(req.user) || !isDbConnected()) {
      const all = getDemoPropertiesForUser(null) || [];
      properties = all.filter((p) => p.forSale === true && p.status === 'verified' && (userId ? p.owner !== userId : true));

      if (req.query.search) {
        const s = req.query.search.toLowerCase();
        properties = properties.filter(
          (p) =>
            p.propertyId.toLowerCase().includes(s) ||
            p.surveyNumber.toLowerCase().includes(s) ||
            p.district.toLowerCase().includes(s)
        );
      }

      if (req.query.sort === 'price_asc') {
        properties.sort((a, b) => a.listingPrice - b.listingPrice);
      } else if (req.query.sort === 'price_desc') {
        properties.sort((a, b) => b.listingPrice - a.listingPrice);
      } else {
        properties.sort((a, b) => new Date(b.listedAt) - new Date(a.listedAt));
      }

      return res.json({
        success: true,
        data: properties.slice(skip, skip + limit),
        count: properties.length,
        page,
        limit,
        demo: true,
      });
    }

    const query = { forSale: true, status: 'verified' };
    if (userId) query.owner = { $ne: userId };

    if (req.query.search) {
      const s = req.query.search;
      query.$or = [
        { propertyId: { $regex: s, $options: 'i' } },
        { surveyNumber: { $regex: s, $options: 'i' } },
        { district: { $regex: s, $options: 'i' } },
      ];
    }

    if (req.query.minPrice) query.listingPrice = { $gte: parseInt(req.query.minPrice) };
    if (req.query.maxPrice) query.listingPrice = { ...query.listingPrice, $lte: parseInt(req.query.maxPrice) };
    if (req.query.district) query.district = req.query.district;

    let sortObj = { listedAt: -1 };
    if (req.query.sort === 'price_asc') sortObj = { listingPrice: 1 };
    else if (req.query.sort === 'price_desc') sortObj = { listingPrice: -1 };

    const items = await Property.find(query)
      .populate('owner', 'fullName email phone')
      .skip(skip)
      .limit(limit)
      .sort(sortObj);

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      data: items,
      count: items.length,
      total,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

export const removePropertyFromSale = async (req, res, next) => {
  try {
    const { propertyId } = req.body;
    const userId = req.user._id ?? req.user.id;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const isDemoRemove = isDemoUser(req.user) || !isDbConnected();

    if (isDemoRemove) {
      const property = findDemoPropertyForOwner(userId, propertyId);
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found or not owned by you' });
      }

      property.forSale = false;
      property.listingPrice = null;
      property.listingDescription = '';
      property.listedAt = null;

      return res.json({
        success: true,
        message: 'Property removed from sale',
        data: property,
        demo: true,
      });
    }

    const property = await Property.findOne({ propertyId, owner: userId });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found or not owned by you' });
    }

    property.forSale = false;
    property.listingPrice = null;
    property.listingDescription = '';
    property.listedAt = null;
    await property.save();

    res.json({
      success: true,
      message: 'Property removed from sale',
      data: property,
    });
  } catch (error) {
    next(error);
  }
};
