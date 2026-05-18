import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { hashAadhaar } from './crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bhumi');
    console.log('Connected to MongoDB for seeding...');

    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      Transaction.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    const owner = await User.create({
      fullName: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '9876543210',
      aadhaarHash: hashAadhaar('234567890124'),
      aadhaarLast4: '0124',
      password: 'Owner@123',
      role: 'owner',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      avatarInitials: 'RK',
    });

    const official = await User.create({
      fullName: 'Dr. Priya Sharma',
      email: 'official@bhumi.gov.in',
      phone: '9123456789',
      aadhaarHash: hashAadhaar('345678901238'),
      aadhaarLast4: '1238',
      password: 'Official@123',
      role: 'government_official',
      walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      avatarInitials: 'PS',
    });

    const verifier = await User.create({
      fullName: 'Amit Patel',
      email: 'verifier@bhumi.gov.in',
      phone: '9988776655',
      aadhaarHash: hashAadhaar('456789012341'),
      aadhaarLast4: '2341',
      password: 'Verifier@123',
      role: 'verifier',
      walletAddress: '0xdD2FD4581271e230360230F9337F950043BE816A',
      avatarInitials: 'AP',
    });

    const properties = await Property.create([
      {
        propertyId: 'BH-001-KHURDA',
        surveyNumber: 'SN-2024-001',
        owner: owner._id,
        ownerAadhaarHash: owner.aadhaarHash,
        ownerName: owner.fullName,
        district: 'Khurda',
        state: 'Odisha',
        pincode: '751001',
        area: 2400,
        landType: 'residential',
        status: 'verified',
        ipfsHash: 'QmSampleHash001',
        transactionHash: '0xabc123def456789',
        verifiedBy: official._id,
        verifiedAt: new Date(),
        blockchainVerified: true,
        documents: [
          { name: 'land_deed.pdf', type: 'deed', ipfsHash: 'QmDeed001' },
          { name: 'ownership_proof.jpg', type: 'ownership_proof', ipfsHash: 'QmProof001' },
        ],
      },
      {
        propertyId: 'BH-002-CUTTACK',
        surveyNumber: 'SN-2024-002',
        owner: owner._id,
        ownerAadhaarHash: owner.aadhaarHash,
        ownerName: owner.fullName,
        district: 'Cuttack',
        state: 'Odisha',
        pincode: '753001',
        area: 5000,
        landType: 'agricultural',
        status: 'pending',
        ipfsHash: 'QmSampleHash002',
        transactionHash: '0xdef456abc789012',
        documents: [
          { name: 'agricultural_deed.pdf', type: 'deed', ipfsHash: 'QmDeed002' },
        ],
      },
      {
        propertyId: 'BH-003-BBSR',
        surveyNumber: 'SN-2024-003',
        owner: owner._id,
        ownerAadhaarHash: owner.aadhaarHash,
        ownerName: owner.fullName,
        district: 'Bhubaneswar',
        state: 'Odisha',
        pincode: '751024',
        area: 1200,
        landType: 'commercial',
        status: 'verified',
        ipfsHash: 'QmSampleHash003',
        transactionHash: '0x789012abc345def',
        verifiedBy: official._id,
        verifiedAt: new Date(),
        blockchainVerified: true,
      },
      {
        propertyId: 'BH-004-PURI',
        surveyNumber: 'SN-2024-004',
        owner: owner._id,
        ownerAadhaarHash: owner.aadhaarHash,
        ownerName: owner.fullName,
        district: 'Puri',
        state: 'Odisha',
        pincode: '752001',
        area: 3200,
        landType: 'agricultural',
        status: 'disputed',
        ipfsHash: 'QmSampleHash004',
        transactionHash: '0xdispute004hash',
        verificationRemarks: 'Boundary dispute with adjacent plot SN-2024-005',
      },
    ]);

    await Transaction.create([
      {
        propertyId: 'BH-001-KHURDA',
        property: properties[0]._id,
        txHash: '0xabc123def456789',
        actionType: 'REGISTER',
        initiatedBy: owner._id,
        status: 'confirmed',
      },
      {
        propertyId: 'BH-001-KHURDA',
        property: properties[0]._id,
        txHash: '0xverify001hash',
        actionType: 'VERIFY',
        initiatedBy: official._id,
        status: 'confirmed',
      },
      {
        propertyId: 'BH-002-CUTTACK',
        property: properties[1]._id,
        txHash: '0xdef456abc789012',
        actionType: 'REGISTER',
        initiatedBy: owner._id,
        status: 'confirmed',
      },
    ]);

    await Notification.create([
      {
        user: owner._id,
        type: 'verification_completed',
        title: 'Property Verified',
        message: 'Your property BH-001-KHURDA has been verified.',
        propertyId: 'BH-001-KHURDA',
      },
      {
        user: official._id,
        type: 'property_registered',
        title: 'New Registration',
        message: 'Property BH-002-CUTTACK awaiting verification.',
        propertyId: 'BH-002-CUTTACK',
        isRead: false,
      },
    ]);

    console.log('\n✅ Seed data created successfully!\n');
    console.log('Sample Accounts:');
    console.log('  Owner:     rajesh@example.com / Owner@123');
    console.log('  Official:  official@bhumi.gov.in / Official@123');
    console.log('  Verifier:  verifier@bhumi.gov.in / Verifier@123');
    console.log('\nSample Properties: BH-001-KHURDA, BH-002-CUTTACK, BH-003-BBSR, BH-004-PURI (disputed)\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
