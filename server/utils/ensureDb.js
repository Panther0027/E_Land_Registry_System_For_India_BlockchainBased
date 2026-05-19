import mongoose from 'mongoose';

/**
 * Ensure MongoDB is connected (retry on auth routes if server started without DB).
 */
export const ensureDbConnection = async () => {
  if (mongoose.connection.readyState === 1) return true;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bhumi';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('MongoDB connected (auth retry):', mongoose.connection.host);
    return true;
  } catch (error) {
    console.warn('MongoDB unavailable:', error.message);
    return false;
  }
};
