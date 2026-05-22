import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema(
  {
    propertyId: { type: String, required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);
export default PurchaseRequest;
