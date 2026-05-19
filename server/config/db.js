import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error('Check Atlas IP whitelist (0.0.0.0/0), credentials, and network access.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }
};

export const isDbConnected = () => mongoose.connection.readyState === 1;

export default connectDB;
