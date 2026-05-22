const transferOtpStore = new Map();

export const buildTransferOtpKey = (userId, propertyId, newOwnerAadhaar) =>
  `${userId}:${propertyId}:${newOwnerAadhaar}`;

export const setTransferOtp = (key, payload) => {
  transferOtpStore.set(key, payload);
};

export const getTransferOtp = (key) => transferOtpStore.get(key);

export const removeTransferOtp = (key) => transferOtpStore.delete(key);

export const cleanupExpiredTransferOtps = () => {
  const now = Date.now();
  for (const [key, entry] of transferOtpStore.entries()) {
    if (entry.expiresAt <= now) {
      transferOtpStore.delete(key);
    }
  }
};

setInterval(cleanupExpiredTransferOtps, 1000 * 60);
