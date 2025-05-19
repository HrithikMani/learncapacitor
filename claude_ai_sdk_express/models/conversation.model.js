// models/conversation.model.js
const mongoose = require('mongoose');

// Define schema for individual messages
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Define schema for conversation sessions
const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  messages: [messageSchema],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create Conversation model
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;


// config/database.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;


// services/conversation.service.js
const Conversation = require('../models/conversation.model');

// Get conversation by session ID
const getConversation = async (sessionId) => {
  try {
    let conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      // Create a new conversation if one doesn't exist
      conversation = new Conversation({
        sessionId,
        messages: []
      });
      await conversation.save();
    }
    
    return conversation;
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    throw error;
  }
};

// Add message to conversation
const addMessage = async (sessionId, message) => {
  try {
    const conversation = await getConversation(sessionId);
    
    // Add the message to the conversation
    conversation.messages.push(message);
    conversation.lastUpdated = Date.now();
    
    // Save the updated conversation
    await conversation.save();
    
    return conversation;
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    throw error;
  }
};

// Clear conversation history
const clearConversation = async (sessionId) => {
  try {
    await Conversation.findOneAndUpdate(
      { sessionId },
      { $set: { messages: [], lastUpdated: Date.now() } },
      { new: true, upsert: true }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing conversation:', error);
    throw error;
  }
};

// Get all messages for a conversation
const getMessages = async (sessionId) => {
  try {
    const conversation = await getConversation(sessionId);
    return conversation.messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

module.exports = {
  getConversation,
  addMessage,
  clearConversation,
  getMessages
};