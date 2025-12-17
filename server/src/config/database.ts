import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/werewolf';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('Server will continue running without MongoDB connection.');
    console.warn('To fix this:');
    console.warn('1. Go to MongoDB Atlas Dashboard');
    console.warn('2. Navigate to Network Access');
    console.warn('3. Add your current IP address to the whitelist');
    console.warn('   Or add 0.0.0.0/0 to allow access from anywhere (less secure)');
    // Don't exit - allow server to run without DB for development
    // process.exit(1);
  }
};

export default connectDB;
