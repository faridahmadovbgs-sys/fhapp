import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fhapp';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('The server will continue without database functionality.');
    console.log('To use authentication features, please start MongoDB and restart the server.');
    return false;
  }
};

export default connectDB;