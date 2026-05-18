import Property from '../models/Property.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { hashAadhaar, generatePropertyId } from '../utils/crypto.js';
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
  getDemoPropertiesForUser,
  getDemoDocumentsForUser,
  addDemoDocumentUpload,
} from '../data/demoDocuments.js';
import { getContract } from '../config/blockchain.js';
import { isDbConnected } from '../config/db.js';
import fs from 'fs';

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

    const propertyId = req.body.propertyId || generatePropertyId();
    const ownerAadhaarHash = hashAadhaar(ownerAadhaar);

    const documents = [];
    let combinedIpfsHash = '';

    if (req.files?.landDeed?.[0]) {
      const file = req.files.landDeed[0];
      const hash = await uploadToIPFS(file.path, file.originalname);
      documents.push({ name: file.originalname, type: 'deed', ipfsHash: hash });
      fs.unlinkSync(file.path);
    }

    if (req.files?.ownershipProof?.[0]) {
      const file = req.files.ownershipProof[0];
      const hash = await uploadToIPFS(file.path, file.originalname);
      documents.push({ name: file.originalname, type: 'ownership_proof', ipfsHash: hash });
      fs.unlinkSync(file.path);
    }

    if (documents.length > 0) {
      combinedIpfsHash = await uploadJSONToIPFS({
        propertyId,
        documents: documents.map((d) => ({ name: d.name, type: d.type, hash: d.ipfsHash })),
      });
    }

    const location = `${district}, ${state} - ${pincode}`;
    const chainResult = await registerPropertyOnChain(
      propertyId,
      ownerAadhaarHash,
      location,
      parseFloat(area),
      combinedIpfsHash
    );

    const coOwners = [];
    if (hasCoOwner === 'true' && coOwnerName && coOwnerAadhaar) {
      coOwners.push({
        name: coOwnerName,
        aadhaarHash: hashAadhaar(coOwnerAadhaar),
        aadhaarLast4: coOwnerAadhaar.replace(/\s/g, '').slice(-4),
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
    const property = await Property.findOne({ propertyId: req.params.id })
      .populate('owner', 'fullName email walletAddress')
      .populate('verifiedBy', 'fullName');

    if (!property) {
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
      let properties = getDemoPropertiesForUser();
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
    const query = { owner: req.user._id };

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
    if (isDemoUser(req.user)) {
      const properties = getDemoPropertiesForUser();
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
        property = await Property.findOne(query).populate('owner', 'fullName');
      } catch (dbErr) {
        console.warn('Property search DB error, trying demo data:', dbErr.message);
      }
    }

    if (!property) {
      const demoProperty = findDemoProperty({ propertyId, surveyNumber });
      if (demoProperty) {
        property = demoProperty;
        demo = true;
      } else {
        return res.json({
          success: true,
          data: null,
          verified: false,
          message: 'Property not found',
        });
      }
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

export const transferOwnership = async (req, res, next) => {
  try {
    const { propertyId, newOwnerAadhaar, transferReason } = req.body;
    const newOwnerHash = hashAadhaar(newOwnerAadhaar);

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
      'transfer_request',
      'Ownership Transferred',
      `You are now the owner of property ${propertyId}.`,
      propertyId
    );

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
    const userId = req.user._id;
    const role = req.user.role;

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

    const [totalProperties, pendingTransfers, verifiedDocs, recentTransactions] = await Promise.all([
      Property.countDocuments({ owner: userId }),
      Property.countDocuments({ owner: userId, status: 'transferred' }),
      Property.countDocuments({ owner: userId, status: 'verified' }),
      Transaction.find({ initiatedBy: userId }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        role: 'owner',
        totalProperties,
        pendingTransfers,
        verifiedDocuments: verifiedDocs,
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

    const properties = await Property.find({ owner: req.user._id }).select(
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
    if (isDemoUser(req.user)) {
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
    const contractAddress = contract?.target ?? process.env.CONTRACT_ADDRESS ?? null;

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

    const demoVerification = getDemoBlockchainVerification(propertyId, contractAddress);
    if (demoVerification) {
      return res.json({
        success: true,
        ...demoVerification,
      });
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
