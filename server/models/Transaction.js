import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      required: true,
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    txHash: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: ['REGISTER', 'VERIFY', 'TRANSFER', 'DISPUTE'],
      required: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'confirmed',
    },
    blockNumber: { type: Number },
    gasUsed: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
