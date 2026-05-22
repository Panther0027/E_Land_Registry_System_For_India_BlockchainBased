import mongoose from 'mongoose';

const coOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  aadhaarHash: { type: String, required: true },
  aadhaarLast4: { type: String, required: true },
});

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['deed', 'ownership_proof', 'other'], default: 'other' },
  ipfsHash: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const propertySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    surveyNumber: {
      type: String,
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerAadhaarHash: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    coOwners: [coOwnerSchema],
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    area: { type: Number, required: true },
    landType: {
      type: String,
      enum: ['agricultural', 'residential', 'commercial'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'disputed', 'transferred'],
      default: 'pending',
    },
    ipfsHash: { type: String, default: '' },
    documents: [documentSchema],
    transactionHash: { type: String, default: '' },
    verificationRemarks: { type: String, default: '' },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: { type: Date },
    blockchainVerified: { type: Boolean, default: false },
    forSale: { type: Boolean, default: false },
    listingPrice: { type: Number, default: null },
    listingDescription: { type: String, default: '' },
    listedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

propertySchema.index({ owner: 1, status: 1 });
propertySchema.index({ district: 1, state: 1 });

const Property = mongoose.model('Property', propertySchema);
export default Property;
