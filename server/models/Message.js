import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    purchaseRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest', required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
export default Message;
