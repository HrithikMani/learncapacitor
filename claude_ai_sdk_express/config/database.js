const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI is not defined. Using in-memory storage instead.');
      return null;
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't exit the process, just return null to indicate failure
    return null;
  }
};

module.exports = connectDB;