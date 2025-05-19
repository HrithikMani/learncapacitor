

const mongoose = require('mongoose');
const crypto = require('crypto');
let Conversation;

// Try to import the Conversation model, but don't fail if it's not available
try {
  Conversation = require('../models/conversation.model');
} catch (error) {
  console.warn('MongoDB model not available, using in-memory storage only');
}

// Modified in-memory storage structure to include titles
// Format: { sessionId: { title: "Title", messages: [] } }
const sessionStorage = {};

// Generate a random session ID
const generateSessionId = () => {
  const timestamp = Date.now().toString(36);
  const randomString = crypto.randomBytes(4).toString('hex');
  return `session_${timestamp}_${randomString}`;
};

// Check if MongoDB is connected
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1 && Conversation !== undefined;
};

// Get conversation by session ID
const getConversation = async (sessionId) => {
  try {
    // Check if MongoDB is connected
    if (isMongoConnected()) {
      // Use MongoDB
      let conversation = await Conversation.findOne({ sessionId });
      
      if (!conversation) {
        // Create a new conversation if one doesn't exist
        conversation = new Conversation({
          sessionId,
          title: `Conversation ${new Date().toLocaleDateString()}`,
          messages: []
        });
        await conversation.save();
      }
      
      return conversation;
    } else {
      // Use in-memory fallback
      if (!sessionStorage[sessionId]) {
        sessionStorage[sessionId] = {
          title: `Conversation ${new Date().toLocaleDateString()}`,
          messages: []
        };
      }
      
      return {
        sessionId,
        title: sessionStorage[sessionId].title,
        messages: sessionStorage[sessionId].messages
      };
    }
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    // Fall back to in-memory storage if MongoDB fails
    if (!sessionStorage[sessionId]) {
      sessionStorage[sessionId] = {
        title: `Conversation ${new Date().toLocaleDateString()}`,
        messages: []
      };
    }
    
    return {
      sessionId,
      title: sessionStorage[sessionId].title,
      messages: sessionStorage[sessionId].messages
    };
  }
};

// Create a new conversation with a random session ID
const createConversation = async (title = null) => {
  const sessionId = generateSessionId();
  const defaultTitle = title || `Conversation ${new Date().toLocaleDateString()}`;
  
  try {
    if (isMongoConnected()) {
      // Use MongoDB
      const conversation = new Conversation({
        sessionId,
        title: defaultTitle,
        messages: []
      });
      
      await conversation.save();
      
      return {
        sessionId,
        title: defaultTitle,
        messages: []
      };
    } else {
      // Use in-memory fallback
      sessionStorage[sessionId] = {
        title: defaultTitle,
        messages: []
      };
      
      return {
        sessionId,
        title: defaultTitle,
        messages: []
      };
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    // Fall back to in-memory storage if MongoDB fails
    sessionStorage[sessionId] = {
      title: defaultTitle,
      messages: []
    };
    
    return {
      sessionId,
      title: defaultTitle,
      messages: []
    };
  }
};

// Add message to conversation
const addMessage = async (sessionId, message) => {
  try {
    // Check if MongoDB is connected
    if (isMongoConnected()) {
      // Use MongoDB
      const conversation = await getConversation(sessionId);
      
      // Add the message to the conversation
      conversation.messages.push(message);
      conversation.lastUpdated = Date.now();
      
      // Generate a title from the first user message if title is default and this is the first message
      if (conversation.title.startsWith('Conversation') && 
          conversation.messages.length === 1 && 
          message.role === 'user') {
        // Use the first ~30 chars of the first message as the title
        const titleText = message.content.substring(0, 30).trim();
        conversation.title = titleText + (titleText.length >= 30 ? '...' : '');
      }
      
      // Save the updated conversation
      await conversation.save();
      
      return conversation;
    } else {
      // Use in-memory fallback
      if (!sessionStorage[sessionId]) {
        sessionStorage[sessionId] = {
          title: `Conversation ${new Date().toLocaleDateString()}`,
          messages: []
        };
      }
      
      sessionStorage[sessionId].messages.push(message);
      
      // Generate a title from the first user message if title is default and this is the first message
      if (sessionStorage[sessionId].title.startsWith('Conversation') && 
          sessionStorage[sessionId].messages.length === 1 && 
          message.role === 'user') {
        // Use the first ~30 chars of the first message as the title
        const titleText = message.content.substring(0, 30).trim();
        sessionStorage[sessionId].title = titleText + (titleText.length >= 30 ? '...' : '');
      }
      
      return {
        sessionId,
        title: sessionStorage[sessionId].title,
        messages: sessionStorage[sessionId].messages
      };
    }
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    // Fall back to in-memory storage if MongoDB fails
    if (!sessionStorage[sessionId]) {
      sessionStorage[sessionId] = {
        title: `Conversation ${new Date().toLocaleDateString()}`,
        messages: []
      };
    }
    
    sessionStorage[sessionId].messages.push(message);
    
    return {
      sessionId,
      title: sessionStorage[sessionId].title,
      messages: sessionStorage[sessionId].messages
    };
  }
};

// Update conversation title
const updateTitle = async (sessionId, title) => {
  if (!title) {
    throw new Error('Title cannot be empty');
  }
  
  try {
    if (isMongoConnected()) {
      // Use MongoDB
      const conversation = await Conversation.findOneAndUpdate(
        { sessionId },
        { $set: { title, lastUpdated: Date.now() } },
        { new: true }
      );
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      return conversation;
    } else {
      // Use in-memory fallback
      if (!sessionStorage[sessionId]) {
        throw new Error('Conversation not found');
      }
      
      sessionStorage[sessionId].title = title;
      
      return {
        sessionId,
        title: sessionStorage[sessionId].title,
        messages: sessionStorage[sessionId].messages
      };
    }
  } catch (error) {
    console.error('Error updating conversation title:', error);
    throw error;
  }
};

// Clear conversation history
const clearConversation = async (sessionId) => {
  try {
    // Check if MongoDB is connected
    if (isMongoConnected()) {
      // Use MongoDB
      const conversation = await Conversation.findOne({ sessionId });
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Keep the title but clear messages
      conversation.messages = [];
      conversation.lastUpdated = Date.now();
      await conversation.save();
    } else {
      // Use in-memory fallback
      if (!sessionStorage[sessionId]) {
        throw new Error('Conversation not found');
      }
      
      // Keep the title but clear messages
      sessionStorage[sessionId].messages = [];
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing conversation:', error);
    // If the error is "Conversation not found", rethrow it
    if (error.message === 'Conversation not found') {
      throw error;
    }
    
    // For other errors, try in-memory fallback
    if (sessionStorage[sessionId]) {
      sessionStorage[sessionId].messages = [];
      return { success: true };
    } else {
      throw new Error('Conversation not found');
    }
  }
};

// Get all messages for a conversation
const getMessages = async (sessionId) => {
  try {
    // Check if MongoDB is connected
    if (isMongoConnected()) {
      // Use MongoDB
      const conversation = await getConversation(sessionId);
      return conversation.messages;
    } else {
      // Use in-memory fallback
      if (!sessionStorage[sessionId]) {
        sessionStorage[sessionId] = {
          title: `Conversation ${new Date().toLocaleDateString()}`,
          messages: []
        };
      }
      
      return sessionStorage[sessionId].messages;
    }
  } catch (error) {
    console.error('Error getting messages:', error);
    // Fall back to in-memory storage if MongoDB fails
    if (!sessionStorage[sessionId]) {
      sessionStorage[sessionId] = {
        title: `Conversation ${new Date().toLocaleDateString()}`,
        messages: []
      };
    }
    
    return sessionStorage[sessionId].messages;
  }
};

// Get all conversations (for listing in UI)
const getAllConversations = async () => {
  try {
    if (isMongoConnected()) {
      // Use MongoDB - Get all conversations with limited data (no messages)
      const conversations = await Conversation.find({}, {
        sessionId: 1,
        title: 1,
        lastUpdated: 1,
        createdAt: 1,
        'messages.createdAt': 1 // Only get timestamps for message count
      }).sort({ lastUpdated: -1 });
      
      return conversations.map(conv => ({
        sessionId: conv.sessionId,
        title: conv.title,
        lastUpdated: conv.lastUpdated || conv.createdAt,
        messageCount: conv.messages.length
      }));
    } else {
      // Use in-memory fallback
      return Object.entries(sessionStorage).map(([sessionId, data]) => ({
        sessionId,
        title: data.title,
        lastUpdated: Date.now(), // No timestamp tracking in memory version
        messageCount: data.messages.length
      }));
    }
  } catch (error) {
    console.error('Error getting all conversations:', error);
    // Fall back to in-memory storage
    return Object.entries(sessionStorage).map(([sessionId, data]) => ({
      sessionId,
      title: data.title,
      lastUpdated: Date.now(),
      messageCount: data.messages.length
    }));
  }
};

// Delete a conversation completely
const deleteConversation = async (sessionId) => {
  try {
    if (isMongoConnected()) {
      // Use MongoDB
      const result = await Conversation.deleteOne({ sessionId });
      
      if (result.deletedCount === 0) {
        throw new Error('Conversation not found');
      }
    } else {
      // Use in-memory fallback
      if (!sessionStorage[sessionId]) {
        throw new Error('Conversation not found');
      }
      
      delete sessionStorage[sessionId];
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    // If the error is "Conversation not found", rethrow it
    if (error.message === 'Conversation not found') {
      throw error;
    }
    
    // For other errors with in-memory, try direct delete
    delete sessionStorage[sessionId];
    return { success: true };
  }
};

module.exports = {
  getConversation,
  createConversation,
  addMessage,
  updateTitle,
  clearConversation,
  getMessages,
  getAllConversations,
  deleteConversation,
  generateSessionId
};