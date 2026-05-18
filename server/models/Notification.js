import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'transfer_request',
        'verification_completed',
        'dispute_raised',
        'transaction_confirmed',
        'property_registered',
        'property_rejected',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    propertyId: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
