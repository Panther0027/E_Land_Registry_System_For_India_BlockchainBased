import Property from '../models/Property.js';
import User from '../models/User.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import Message from '../models/Message.js';
import { createNotification, transferOwnershipOnChain, createTransactionRecord, getPropertyFromChain, registerPropertyOnChain, verifyPropertyOnChain } from '../services/blockchainService.js';
import { getIO } from '../config/socket.js';
import { isDemoUser } from '../data/demoDocuments.js';
import { getDemoPropertiesForUser } from '../data/demoPropertyStore.js';
import { getDemoUserByAadhaarHash } from '../services/demoAuthStore.js';
import { hashAadhaar } from '../utils/crypto.js';

export const getAvailableProperties = async (req, res, next) => {
  try {
    const userId = req.user?._id ?? req.user?.id;
    const q = { status: 'verified' };
    if (userId) q.owner = { $ne: userId };

    // simple pagination
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    let properties = [];
    if (isDemoUser(req.user)) {
      const all = getDemoPropertiesForUser(null) || [];
      properties = all.filter((p) => p.status === 'verified' && p.owner !== userId).slice(skip, skip + limit);
      return res.json({ success: true, data: properties, count: properties.length, demo: true });
    }

    if (req.query.search) {
      const s = req.query.search;
      q.$or = [
        { propertyId: { $regex: s, $options: 'i' } },
        { surveyNumber: { $regex: s, $options: 'i' } },
        { district: { $regex: s, $options: 'i' } },
      ];
    }

    const items = await Property.find(q).populate('owner', 'fullName email').skip(skip).limit(limit).sort({ createdAt: -1 });
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseRequest = async (req, res, next) => {
  try {
    const buyerId = req.user._id ?? req.user.id;
    const { propertyId, message } = req.body;
    if (!propertyId) return res.status(400).json({ success: false, message: 'propertyId required' });

    const property = await Property.findOne({ propertyId }).populate('owner');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (property.owner._id.toString() === buyerId.toString()) return res.status(400).json({ success: false, message: 'You already own this property' });

    const existing = await PurchaseRequest.findOne({ propertyId, buyer: buyerId, status: 'pending' });
    if (existing) return res.status(400).json({ success: false, message: 'You already have a pending request for this property' });

    const pr = await PurchaseRequest.create({ propertyId, property: property._id, buyer: buyerId, owner: property.owner._id, message });

    await createNotification(property.owner._id, 'purchase_request', 'Purchase Request', `User requested to buy ${propertyId}`, propertyId);
    // emit realtime event to owner
    const io = getIO();
    if (io) {
      io.to(`user:${property.owner._id}`).emit('purchase_request', { request: pr });
    }

    res.json({ success: true, data: pr, message: 'Purchase request created' });
  } catch (error) {
    next(error);
  }
};

export const getRequestsForOwner = async (req, res, next) => {
  try {
    const ownerId = req.user._id ?? req.user.id;
    const requests = await PurchaseRequest.find({ owner: ownerId }).populate('buyer', 'fullName email').populate('property');
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (req, res, next) => {
  try {
    console.log('approveRequest start', req.params.id);
    const ownerId = req.user._id ?? req.user.id;
    const pr = await PurchaseRequest.findById(req.params.id).populate('property').populate('buyer').populate('owner');
    console.log('approveRequest loaded PR', pr?._id, pr?.propertyId, pr?.status);
    if (!pr) return res.status(404).json({ success: false, message: 'Request not found' });
    if (pr.owner._id.toString() !== ownerId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (pr.status !== 'pending') return res.status(400).json({ success: false, message: 'Request not pending' });
    // perform transfer on-chain and update DB
    const property = await Property.findOne({ propertyId: pr.propertyId });
    console.log('approveRequest loaded property', property?.propertyId, property?.status);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    if (property.status !== 'verified') {
      // still allow approval but do not transfer
      pr.status = 'approved';
      await pr.save();
      await createNotification(pr.buyer._id, 'purchase_approved', 'Purchase Approved', `Owner approved purchase request for ${pr.propertyId}`, pr.propertyId);
      return res.json({ success: true, data: pr, message: 'Request approved (property not eligible for on-chain transfer)' });
    }

    const buyer = await User.findById(pr.buyer._id);
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });

    // ensure property exists on-chain; if not, register and verify as needed
    const chainProp = await getPropertyFromChain(pr.propertyId);
    if (!chainProp) {
      // register with current owner aadhaar hash
      await registerPropertyOnChain(property.propertyId, property.ownerAadhaarHash, `${property.district}, ${property.state}`, property.area, property.ipfsHash || '');
      // if DB marks property verified, ensure it's verified on-chain as well
      if (property.status === 'verified') {
        await verifyPropertyOnChain(property.propertyId);
      }
    }

    // call blockchain transfer
    const chainResult = await transferOwnershipOnChain(pr.propertyId, buyer.aadhaarHash);
    const txHash = chainResult?.txHash || chainResult?.transactionHash || chainResult?.hash;

    // ensure we received a txHash
    if (!chainResult || !txHash) {
      console.error('transferOwnershipOnChain returned no txHash:', chainResult);
      return res.status(500).json({ success: false, message: 'Transfer failed: no transaction hash returned' });
    }

    // update property owner in DB
    property.owner = buyer._id;
    property.ownerAadhaarHash = buyer.aadhaarHash;
    property.ownerName = buyer.fullName;
    property.status = 'transferred';
    property.transactionHash = txHash;
    await property.save();
    console.log('approveRequest property updated');

    // mark request approved
    pr.status = 'approved';
    pr.metadata = { txHash, blockNumber: chainResult.blockNumber };
    await pr.save();
    console.log('approveRequest request saved');

    // create transaction record
    console.log('approveRequest: chainResult', chainResult);
    const txRecord = await createTransactionRecord({
      propertyId: pr.propertyId,
      property: property._id,
      txHash,
      actionType: 'TRANSFER',
      initiatedBy: pr.owner._id,
      details: { previousOwner: pr.owner.fullName, newOwner: buyer.fullName },
      blockNumber: chainResult.blockNumber,
    });
    console.log('approveRequest: txRecord', txRecord);

    await createNotification(pr.buyer._id, 'purchase_approved', 'Purchase Approved', `Owner approved and transfer completed for ${pr.propertyId}`, pr.propertyId);
    await createNotification(pr.owner._id, 'purchase_completed', 'Transfer Completed', `You transferred ${pr.propertyId} to ${buyer.fullName}`, pr.propertyId);

    console.log('approveRequest complete');
    res.json({ success: true, data: pr, message: 'Request approved and transfer completed', transactionHash: txHash });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const ownerId = req.user._id ?? req.user.id;
    const pr = await PurchaseRequest.findById(req.params.id).populate('owner');
    if (!pr) return res.status(404).json({ success: false, message: 'Request not found' });
    if (pr.owner._id.toString() !== ownerId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (pr.status !== 'pending') return res.status(400).json({ success: false, message: 'Request not pending' });

    pr.status = 'rejected';
    await pr.save();
    await createNotification(pr.buyer, 'purchase_rejected', 'Purchase Rejected', `Owner rejected purchase request for ${pr.propertyId}`, pr.propertyId);
    res.json({ success: true, data: pr, message: 'Request rejected' });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user._id ?? req.user.id;
    const { text } = req.body;
    const prId = req.params.id;
    if (!text) return res.status(400).json({ success: false, message: 'text required' });

    const pr = await PurchaseRequest.findById(prId).populate('buyer owner');
    if (!pr) return res.status(404).json({ success: false, message: 'Request not found' });

    const other = pr.buyer._id.toString() === userId.toString() ? pr.owner : pr.buyer;
    const msg = await Message.create({ purchaseRequest: pr._id, from: userId, to: other._id, text });
    await createNotification(other._id, 'message', 'New message', `New message regarding ${pr.propertyId}`, pr.propertyId);
    const io = getIO();
    if (io) {
      io.to(`purchase:${pr._id}`).emit('new_message', { message: msg });
      io.to(`user:${other._id}`).emit('new_message', { message: msg });
    }

    res.json({ success: true, data: msg });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const prId = req.params.id;
    const messages = await Message.find({ purchaseRequest: prId }).populate('from to', 'fullName email').sort({ createdAt: 1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};
