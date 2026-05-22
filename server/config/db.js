import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not configured. Set it in .env to a local or Atlas MongoDB URL.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error('Check MongoDB URI, credentials, and network access.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }
};

export const isDbConnected = () => mongoose.connection.readyState === 1;

export default connectDB;
